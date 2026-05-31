"""BOOM photometry-ingestion integration tests.

These exercise the SkyPortal-side photometry write that the BOOM plugin's
consumer performs in ``ingest_photometry_array``
(boom-skyportal-plugin/main.py): for each ``(survey, programid)`` chunk it
builds a flux-space payload (parallel ``mjd``/``flux``/``fluxerr``/``filter``/
``zp``/``magsys``/``ra``/``dec``/``origin`` arrays) and hands it to
``skyportal.handlers.api.photometry.add_external_photometry``.

Unlike the other BOOM tests in this directory, these do NOT hit the live BOOM
API / mongo (no ``requires_boom_data``): they drive the photometry write
directly with a BOOM-shaped payload, so they run without a seeded broker.

NOTE — sync vs async
--------------------
These call the *synchronous* ``add_external_photometry(json, user)`` directly,
matching the currently-pinned skyportal (it opens its own session when none is
passed). Once skyportal PR #6140 lands — ``add_external_photometry`` becomes a
coroutine and the ``commit_external_photometry`` bridge is added, and BOOM
switches to it — update the calls below to::

    import asyncio
    from skyportal.handlers.api.photometry import commit_external_photometry

    asyncio.run(commit_external_photometry(payload, super_admin_user.id))

At that point ``test_ingest_photometry_match_object`` becomes the regression
guard for the separate-session visibility fix: the bridge runs in its own
session, so the match ``Obj`` must be committed before its photometry is
ingested (in sync it shares BOOM's session and the ordering is moot).
"""

import uuid

from skyportal.handlers.api.photometry import add_external_photometry
from skyportal.models import DBSession
from skyportal.tests import api


def _ingest(payload, user):
    """Call the sync add_external_photometry the way BOOM does, but pass an
    explicit session. add_external_photometry only closes the session it opened
    itself (parent_session is None); passing the shared scoped session avoids
    closing it, which would otherwise detach the test's fixture objects
    (super_admin_user, ztf_camera, ...) and break a second call / teardown."""
    add_external_photometry(payload, user, DBSession())


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
