"""DB-backed tests for the BOOM consumer's per-record ingestion logic.

Unlike the other tests in this directory (which exercise SkyPortal's
``@boom_available`` *API* endpoints against a live broker), these drive the
BOOM plugin's own consumer logic directly: ``process_record`` from the deployed
plugin (``services/boom/main.py``), the function the Kafka loop calls for each
decoded alert. They assert the resulting SkyPortal DB state (Obj, Candidate,
Annotation, Photometry, SuperObj) for synthetic records — no Kafka, no Avro, no
seeded mongo.

This is possible because the plugin was refactored to be import-safe
(``load_env``/``init_db`` and the ``confluent_kafka``/``fastavro`` imports are
deferred), and the per-record loop body was extracted into::

    process_record(record, session, *, boom_filters, programid2streamid,
                   survey2instrumentid, user, boom_client)

Requirements / skips
--------------------
* The refactored BOOM plugin must be deployed (cloned to a ``services/boom``
  path) and importable; otherwise every test here skips. Point Fritz's
  ``services.external.boom.rev`` at the branch that contains ``process_record``.

NOTE — sync vs async
--------------------
These assume the *synchronous* skyportal (``add_external_photometry`` shares the
session passed in). Once skyportal goes async (#6140) and BOOM switches to the
``commit_external_photometry`` bridge, ``test_process_record_match_object``
becomes the regression guard for the separate-session visibility fix: the match
Obj must be committed before its photometry is ingested.
"""

import importlib.util
import json
import os
import uuid

import pytest
import sqlalchemy as sa

from skyportal.models import (
    Annotation,
    Candidate,
    DBSession,
    Obj,
    Photometry,
)

# SuperObj / ObjToSuperObj are BOOM-era models; import defensively so this
# module still collects on a skyportal without them.
try:
    from skyportal.models import ObjToSuperObj
except ImportError:  # pragma: no cover
    ObjToSuperObj = None


BOOM_FILTER_ID = 424242  # arbitrary BOOM-side filter id used in the maps below
ZTF_ZP = 23.9  # matches BOOM's ZP_PER_SURVEY["ZTF"]


def _candidate_boom_paths():
    paths = []
    try:
        from baselayer.app.env import load_env

        _, cfg = load_env()
        for base in cfg.get("services.paths") or []:
            paths.append(os.path.join(base, "boom", "main.py"))
    except Exception:
        pass
    paths += [
        "services/boom/main.py",
        "/skyportal/services/boom/main.py",
        os.path.join(os.getcwd(), "services", "boom", "main.py"),
    ]
    # de-dup, preserve order
    seen, unique = set(), []
    for p in paths:
        if p not in seen:
            seen.add(p)
            unique.append(p)
    return unique


def _load_boom_module():
    """Import the deployed BOOM plugin (services/boom/main.py).

    Returns ``(module, reason)``: on success ``(module, None)``; on failure
    ``(None, reason)`` where ``reason`` explains *why* (paths searched and not
    found, or the import exception) so the skip is diagnostic rather than silent.
    """
    candidate_paths = _candidate_boom_paths()
    found = None
    for path in candidate_paths:
        if os.path.exists(path):
            found = path
            break
    if found is None:
        return None, f"boom main.py not found; searched: {candidate_paths}"
    try:
        spec = importlib.util.spec_from_file_location("boom_plugin_main", found)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    except Exception as e:
        return None, f"found {found} but import failed: {type(e).__name__}: {e}"
    if not hasattr(module, "process_record"):
        return None, (
            f"imported {found} but it has no process_record "
            "(deployed BOOM predates the testability refactor?)"
        )
    return module, None


@pytest.fixture(scope="module")
def boom_module():
    module, reason = _load_boom_module()
    if module is None:
        pytest.skip(f"Deployed BOOM plugin not usable: {reason}")
    return module


def _group_dict(group):
    return {"name": group.name, "nickname": getattr(group, "nickname", None)}


def _maps(public_filter, public_group, public_stream, ztf_camera):
    """Build the dependency maps process_record expects, by hand (so the test
    doesn't depend on Filter.altdata.boom or an LSST instrument existing)."""
    boom_filters = {
        BOOM_FILTER_ID: {
            "id": public_filter.id,
            "name": public_filter.name,
            "group": _group_dict(public_group),
        }
    }
    programid2streamid = {("ZTF", 1): [public_stream.id]}
    survey2instrumentid = {"ZTF": ztf_camera.id}
    return boom_filters, programid2streamid, survey2instrumentid


def _ztf_photometry(ra=234.22, dec=-22.33):
    """BOOM-format photometry array (flux in nJy): a detection, a
    forced-photometry point, and a sub-threshold non-detection."""
    base = {"survey": "ZTF", "programid": 1, "ra": ra, "dec": dec}
    return [
        # detection (S/N = 100 >> SNT) on an Alert
        {
            **base,
            "origin": "Alert",
            "jd": 2459000.5,
            "band": "ztfg",
            "flux": 1.0e4,
            "flux_err": 1.0e2,
        },
        # forced-photometry detection
        {
            **base,
            "origin": "ForcedPhot",
            "jd": 2459001.5,
            "band": "ztfr",
            "flux": 2.0e4,
            "flux_err": 1.0e2,
        },
        # non-detection: S/N = 1 < SNT -> BOOM sets flux to None
        {
            **base,
            "origin": "Alert",
            "jd": 2459002.5,
            "band": "ztfg",
            "flux": 1.0e2,
            "flux_err": 1.0e2,
        },
    ]


def _record(
    obj_id,
    candid,
    *,
    survey="ZTF",
    ra=234.22,
    dec=-22.33,
    photometry=None,
    survey_matches=None,
):
    return {
        "objectId": obj_id,
        "survey": survey,
        "candid": candid,
        "ra": ra,
        "dec": dec,
        "filters": [
            {
                "filter_id": BOOM_FILTER_ID,
                "passed_at": 1700000000000,  # ms epoch
                "annotations": json.dumps({"drb": 0.99}),
            }
        ],
        "photometry": photometry
        if photometry is not None
        else _ztf_photometry(ra, dec),
        "survey_matches": survey_matches or {},
    }


def _count(session, model, obj_id):
    return session.scalar(
        sa.select(sa.func.count()).select_from(model).where(model.obj_id == obj_id)
    )


def _run_process_record(boom_module, record, maps, user):
    """Run process_record on the shared scoped session WITHOUT closing it.

    A ``with DBSession() as session:`` block closes the scoped session on exit,
    which detaches the test's fixture objects (super_admin_user, ztf_camera,
    ...) and breaks both a second call and fixture teardown. process_record and
    add_external_photometry only close sessions they open themselves, so passing
    the shared session and leaving it open is safe.
    """
    boom_filters, programid2streamid, survey2instrumentid = maps
    boom_module.process_record(
        record,
        DBSession(),
        boom_filters=boom_filters,
        programid2streamid=programid2streamid,
        survey2instrumentid=survey2instrumentid,
        user=user,
        boom_client=None,
    )


def test_process_record_main_object(
    boom_module,
    super_admin_user,
    public_group,
    public_stream,
    public_filter,
    ztf_camera,
):
    """A passing filter creates the Obj + Candidate + Annotation and ingests
    the main object's photometry (detections + a non-detection)."""
    obj_id = f"ZTF_boomproc_{uuid.uuid4().hex[:8]}"
    maps = _maps(public_filter, public_group, public_stream, ztf_camera)
    record = _record(obj_id, candid=10_000_001)

    _run_process_record(boom_module, record, maps, super_admin_user)

    session = DBSession()
    assert session.scalar(sa.select(Obj).where(Obj.id == obj_id)) is not None
    assert _count(session, Candidate, obj_id) == 1
    assert _count(session, Annotation, obj_id) == 1

    phot = session.scalars(
        sa.select(Photometry).where(Photometry.obj_id == obj_id)
    ).all()
    assert len(phot) == 3
    # the sub-threshold point is stored as a non-detection (flux is None/NaN)
    n_nondet = sum(1 for p in phot if p.flux is None or p.flux != p.flux)
    assert n_nondet == 1


def test_process_record_is_idempotent(
    boom_module,
    super_admin_user,
    public_group,
    public_stream,
    public_filter,
    ztf_camera,
):
    """Re-delivering the same alert (Kafka at-least-once) must not duplicate
    candidates or photometry: the IntegrityError guard rejects the duplicate
    candidate and add_external_photometry's duplicates='update' dedups rows."""
    obj_id = f"ZTF_boomidem_{uuid.uuid4().hex[:8]}"
    maps = _maps(public_filter, public_group, public_stream, ztf_camera)
    record = _record(obj_id, candid=10_000_002)

    for _ in range(2):
        _run_process_record(boom_module, record, maps, super_admin_user)

    session = DBSession()
    assert _count(session, Candidate, obj_id) == 1
    assert _count(session, Photometry, obj_id) == 3


def test_process_record_match_object(
    boom_module,
    super_admin_user,
    public_group,
    public_stream,
    public_filter,
    ztf_camera,
):
    """Cross-survey match path: a non-ZTF main object with a ZTF match. The
    match Obj is created and its photometry ingested, and a SuperObj links the
    two. This is the regression guard for the async separate-session fix (the
    match Obj must be committed before its photometry is ingested).
    """
    main_obj_id = f"LSST_boommain_{uuid.uuid4().hex[:8]}"
    match_obj_id = f"ZTF_boommatch_{uuid.uuid4().hex[:8]}"
    maps = _maps(public_filter, public_group, public_stream, ztf_camera)
    # main object is LSST (so the ZTF match isn't skipped as same-survey) and
    # carries no photometry (keeps the test to a single instrument/stream map);
    # the match carries the ZTF photometry.
    record = _record(
        main_obj_id,
        candid=10_000_003,
        survey="LSST",
        photometry=[],
        survey_matches={
            "ZTF": {
                "objectId": match_obj_id,
                "ra": 120.0,
                "dec": 10.0,
                "photometry": _ztf_photometry(ra=120.0, dec=10.0),
            }
        },
    )

    _run_process_record(boom_module, record, maps, super_admin_user)

    session = DBSession()
    # the match object exists and got its photometry
    assert session.scalar(sa.select(Obj).where(Obj.id == match_obj_id)) is not None
    assert _count(session, Photometry, match_obj_id) == 3

    # both objects are associated under one SuperObj
    if ObjToSuperObj is not None:
        super_ids_main = set(
            session.scalars(
                sa.select(ObjToSuperObj.super_obj_id).where(
                    ObjToSuperObj.obj_id == main_obj_id
                )
            ).all()
        )
        super_ids_match = set(
            session.scalars(
                sa.select(ObjToSuperObj.super_obj_id).where(
                    ObjToSuperObj.obj_id == match_obj_id
                )
            ).all()
        )
        assert super_ids_main, "main object not associated to a SuperObj"
        assert super_ids_main == super_ids_match, (
            "main and match objects are not under the same SuperObj"
        )
