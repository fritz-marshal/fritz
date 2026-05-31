"""Integration tests for the broker-canonical photometry passthrough endpoint
(``GET /api/boom/surveys/{survey}/objects/{object_id}/photometry``).

These need a live BOOM (seeded mongo) and run in the Fritz integration CI job;
they auto-skip locally when no BOOM seed is present (see the boom conftest).
"""

import time

import pytest

from skyportal.tests import api

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
