"""BOOM photometry-ingestion integration tests.

These exercise the SkyPortal-side photometry write that the BOOM plugin's
consumer performs in ``ingest_photometry_array``
(boom-skyportal-plugin/main.py): for each ``(survey, programid)`` chunk it
builds a flux-space payload (parallel ``mjd``/``flux``/``fluxerr``/``filter``/
``zp``/``magsys``/``ra``/``dec``/``origin`` arrays) and hands it to
``skyportal.handlers.api.photometry.commit_external_photometry`` (the
sync→async bridge over ``add_external_photometry``).

Unlike the other BOOM tests in this directory, these do NOT hit the live BOOM
API / mongo (no ``requires_boom_data``): they drive the photometry write
directly with a BOOM-shaped payload, so they run without a seeded broker.

NOTE — async ingestion
----------------------
skyportal #6140 made ``add_external_photometry`` a coroutine and added the
``commit_external_photometry`` bridge (opens its own async session, re-loads
the user by id, writes, commits). These tests drive that bridge via
``asyncio.run`` — matching the BOOM plugin's ``flush_photometry``.
``test_ingest_photometry_match_object`` is the regression guard for the
separate-session visibility fix: the bridge runs in its own session, so an
``Obj`` must be committed before its photometry is ingested.
"""

import asyncio
import time
import uuid

import pytest

from skyportal.handlers.api.photometry import commit_external_photometry
from skyportal.tests import api


def _ingest(payload, user):
    """Drive the SkyPortal photometry write the way the BOOM plugin does. Since
    skyportal #6140 ``add_external_photometry`` is a coroutine, so we go through
    the ``commit_external_photometry`` bridge (opens its own async session,
    re-loads the user by id, writes, commits) via ``asyncio.run`` — matching the
    plugin's ``flush_photometry``."""
    asyncio.run(commit_external_photometry(payload, user.id))


# Matches BOOM's ZP_PER_SURVEY["ZTF"] in main.py: photometry is submitted in
# flux space with this zeropoint.
ZTF_ZP = 23.9


def _boom_photometry_payload(obj_id, instrument_id, group_ids, ra=234.22, dec=-22.33):
    """A flux-space payload shaped exactly like the per-chunk dicts BOOM builds
    in ``ingest_photometry_array``: parallel arrays, ``zp``/``magsys``, and an
    ``origin`` column carrying ``None`` (Alert) and ``"alert_fp"`` (ForcedPhot).

    Includes one non-detection (``flux=None``) — BOOM emits that for points
    below its signal-to-noise threshold — to confirm detections and
    non-detections are both ingested.
    """
    return {
        "obj_id": obj_id,
        "group_ids": group_ids,
        "instrument_id": instrument_id,
        "mjd": [59000.0, 59001.0, 59002.0],
        "flux": [1000.0, None, 2000.0],
        "fluxerr": [10.0, 12.0, 15.0],
        "filter": ["ztfg", "ztfg", "ztfr"],
        "zp": [ZTF_ZP, ZTF_ZP, ZTF_ZP],
        "magsys": ["ab", "ab", "ab"],
        "ra": [ra, ra, ra],
        "dec": [dec, dec, dec],
        "origin": [None, None, "alert_fp"],
    }


def _create_source(obj_id, token, group_id, ra=234.22, dec=-22.33):
    status, data = api(
        "POST",
        "sources",
        data={"id": obj_id, "ra": ra, "dec": dec, "group_ids": [group_id]},
        token=token,
    )
    assert status == 200, data
    assert data["data"]["id"] == obj_id


def _get_photometry(obj_id, token):
    status, data = api(
        "GET",
        f"sources/{obj_id}",
        params={"includePhotometry": "true"},
        token=token,
    )
    assert status == 200, data
    return data["data"]["photometry"]


def test_ingest_photometry_main_object(
    upload_data_token, super_admin_user, public_group, ztf_camera
):
    """The main-object path: an Obj that already exists (saved as a source)
    gets BOOM-shaped flux-space photometry, including a non-detection and a
    forced-photometry point."""
    obj_id = f"ZTF_boomphot_{uuid.uuid4().hex[:8]}"
    _create_source(obj_id, upload_data_token, public_group.id)

    payload = _boom_photometry_payload(obj_id, ztf_camera.id, [public_group.id])
    # sync call; see the module docstring for the async (#6140) update.
    _ingest(payload, super_admin_user)

    photometry = _get_photometry(obj_id, upload_data_token)
    assert len(photometry) == 3

    flux_by_mjd = {p["mjd"]: p["flux"] for p in photometry}
    # the non-detection (flux=None) is preserved as a non-detection
    assert flux_by_mjd[59001.0] is None
    # the detections are ingested with a (non-null) flux
    assert flux_by_mjd[59000.0] is not None
    assert flux_by_mjd[59002.0] is not None

    # the forced-photometry origin round-trips
    origins = {p.get("origin") for p in photometry}
    assert "alert_fp" in origins


def test_ingest_photometry_match_object(
    upload_data_token, super_admin_user, public_group, ztf_camera
):
    """The cross-survey *match*-object path. BOOM ingests photometry for a
    second object discovered as a match.

    In the current (sync) world this shares BOOM's session and Just Works.
    Once #6140 lands it only works if the match Obj is committed before its
    photometry is ingested, because ``commit_external_photometry`` runs in a
    separate session and can only see committed rows — this test is the
    regression guard for that fix.
    """
    match_obj_id = f"ZTF_boommatch_{uuid.uuid4().hex[:8]}"
    _create_source(match_obj_id, upload_data_token, public_group.id, ra=120.0, dec=10.0)

    payload = _boom_photometry_payload(
        match_obj_id, ztf_camera.id, [public_group.id], ra=120.0, dec=10.0
    )
    # sync call; see the module docstring for the async (#6140) update.
    _ingest(payload, super_admin_user)

    photometry = _get_photometry(match_obj_id, upload_data_token)
    assert len(photometry) == 3


def test_ingest_photometry_is_idempotent(
    upload_data_token, super_admin_user, public_group, ztf_camera
):
    """BOOM can re-deliver the same alert (at-least-once Kafka semantics), so
    ingesting the same photometry twice must not duplicate rows. add_external_
    photometry defaults to duplicates="update", which BOOM relies on."""
    obj_id = f"ZTF_boomdup_{uuid.uuid4().hex[:8]}"
    _create_source(obj_id, upload_data_token, public_group.id)

    payload = _boom_photometry_payload(obj_id, ztf_camera.id, [public_group.id])
    _ingest(payload, super_admin_user)
    _ingest(payload, super_admin_user)

    photometry = _get_photometry(obj_id, upload_data_token)
    assert len(photometry) == 3


# --- broker-canonical photometry passthrough tests ---

SURVEY = "ZTF"
UNKNOWN_OID = "ZTF99zzzzzz"


def _phot_url(oid: str) -> str:
    return f"boom/surveys/{SURVEY}/objects/{oid}/photometry"


def _save_object(token, public_group, oid):
    """Persist the BOOM object as a SkyPortal source (so the Obj exists, which
    photometry standardization requires)."""
    status, _ = api(
        "POST",
        f"boom/surveys/{SURVEY}/objects/{oid}",
        data={"group_ids": [public_group.id]},
        token=token,
    )
    assert status == 200


@pytest.mark.requires_boom_data
def test_passthrough_returns_serialized_photometry(
    upload_data_token, super_admin_token, public_group, boom_seed_oid
):
    """The passthrough returns on-demand broker photometry in SkyPortal's own
    serialized shape (same keys as GET /sources/{id}/photometry).

    Fetched as an admin so scope filtering is bypassed and points are present;
    the stream-based scope filtering itself is covered by the unit tests in
    test_boom_photometry_cache.py.
    """
    _save_object(upload_data_token, public_group, boom_seed_oid)

    status, data = api("GET", _phot_url(boom_seed_oid), token=super_admin_token)
    assert status == 200, data
    assert data["status"] == "success"

    # Bare list of points, same response shape as GET /sources/{id}/photometry.
    points = data["data"]
    assert isinstance(points, list)
    assert len(points) > 0

    # Each point matches the serialized photometry shape used by the DB endpoint.
    point = points[0]
    for key in [
        "obj_id",
        "mjd",
        "filter",
        "instrument_id",
        "instrument_name",
        "mag",
        "magerr",
    ]:
        assert key in point, f"missing key {key!r} in serialized point {point}"
    assert point["obj_id"] == boom_seed_oid


@pytest.mark.requires_boom_data
def test_passthrough_does_not_persist(
    upload_data_token, super_admin_token, public_group, boom_seed_oid
):
    """The passthrough must not write to Postgres: the DB photometry count for
    the object is unchanged by a passthrough GET."""
    _save_object(upload_data_token, public_group, boom_seed_oid)

    status, before = api(
        "GET", f"sources/{boom_seed_oid}/photometry", token=super_admin_token
    )
    assert status == 200
    n_before = len(before["data"])

    # Fetch as admin so broker points are actually serialized (scope filtering
    # bypassed) — then confirm that producing them wrote nothing to Postgres.
    status, _ = api("GET", _phot_url(boom_seed_oid), token=super_admin_token)
    assert status == 200

    status, after = api(
        "GET", f"sources/{boom_seed_oid}/photometry", token=super_admin_token
    )
    assert status == 200
    assert len(after["data"]) == n_before


@pytest.mark.requires_boom_data
def test_passthrough_merges_db_photometry(
    upload_data_token, super_admin_token, public_group, boom_seed_oid, ztf_camera
):
    """The response merges persisted (DB) photometry with the broker points. We
    post a distinctive DB point directly (deterministic, independent of whether
    the broker-save ran) and confirm it appears, by its DB id, in the merge."""
    _save_object(upload_data_token, public_group, boom_seed_oid)

    status, data = api(
        "POST",
        "photometry",
        data={
            "obj_id": boom_seed_oid,
            "mjd": 40000.0,  # far from any real ZTF epoch, so it is not deduped
            "instrument_id": ztf_camera.id,
            "flux": 12.24,
            "fluxerr": 0.031,
            "zp": 25.0,
            "magsys": "ab",
            "filter": "ztfg",
            "group_ids": [public_group.id],
        },
        token=upload_data_token,
    )
    assert status == 200, data
    posted_id = data["data"]["ids"][0]

    status, data = api("GET", _phot_url(boom_seed_oid), token=super_admin_token)
    assert status == 200, data
    points = data["data"]
    assert posted_id in {p.get("id") for p in points}


@pytest.mark.requires_boom_data
def test_passthrough_refresh_returns_photometry(
    upload_data_token, super_admin_token, public_group, boom_seed_oid
):
    """?refresh=true bypasses the cached broker payload and still returns a
    valid merged photometry list."""
    _save_object(upload_data_token, public_group, boom_seed_oid)
    status, data = api(
        "GET", f"{_phot_url(boom_seed_oid)}?refresh=true", token=super_admin_token
    )
    assert status == 200, data
    assert isinstance(data["data"], list)


@pytest.mark.requires_boom_data
def test_passthrough_populates_phot_stat(
    upload_data_token, super_admin_token, public_group, boom_seed_oid
):
    """A passthrough fetch fires a (fire-and-forget) PhotStat recompute over the
    full DB + broker photometry, so listings/scanning reflect broker data. We
    poll because the update runs in the background after the response returns."""
    _save_object(upload_data_token, public_group, boom_seed_oid)

    status, _ = api(
        "GET", f"{_phot_url(boom_seed_oid)}?refresh=true", token=super_admin_token
    )
    assert status == 200

    last = None
    for _ in range(30):
        status, data = api(
            "GET", f"sources/{boom_seed_oid}/phot_stat", token=super_admin_token
        )
        if status == 200 and (data["data"].get("num_det_global") or 0) > 0:
            assert data["data"]["last_detected_mjd"] is not None
            return
        last = (status, data)
        time.sleep(1)
    pytest.fail(f"PhotStat not populated after passthrough; last={last}")


@pytest.mark.requires_boom_data
def test_passthrough_unknown_object_is_empty(upload_data_token):
    """An object unknown to both the broker and the DB yields an empty list
    (not an error) — there is simply no photometry to show."""
    status, data = api("GET", _phot_url(UNKNOWN_OID), token=upload_data_token)
    assert status == 200, data
    assert data["data"] == []
