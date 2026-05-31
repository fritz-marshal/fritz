"""Integration tests for the broker-canonical photometry passthrough endpoint
(``GET /api/boom/surveys/{survey}/objects/{object_id}/photometry``).

These need a live BOOM (seeded mongo) and run in the Fritz integration CI job;
they auto-skip locally when no BOOM seed is present (see the boom conftest).
"""

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

    payload = data["data"]
    assert payload["obj_id"] == boom_seed_oid
    points = payload["photometry"]
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
    # At least one detection should carry a magnitude.
    assert any(p.get("mag") is not None for p in points)


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
    upload_data_token, super_admin_token, public_group, boom_seed_oid
):
    """The response merges persisted (DB) photometry with the broker points:
    saved points (which carry a DB ``id``) appear in the result."""
    _save_object(upload_data_token, public_group, boom_seed_oid)

    status, data = api("GET", _phot_url(boom_seed_oid), token=super_admin_token)
    assert status == 200, data
    points = data["data"]["photometry"]
    assert len(points) > 0
    # Saved photometry (from the POST above) is present, identified by its DB id;
    # broker points that duplicate saved ones are deduped away.
    assert any(p.get("id") is not None for p in points)


@pytest.mark.requires_boom_data
def test_passthrough_unknown_object_is_empty(upload_data_token):
    """An object unknown to both the broker and the DB yields an empty list
    (not an error) — there is simply no photometry to show."""
    status, data = api("GET", _phot_url(UNKNOWN_OID), token=upload_data_token)
    assert status == 200, data
    assert data["data"]["photometry"] == []
