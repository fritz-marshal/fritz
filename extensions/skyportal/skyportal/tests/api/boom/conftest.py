"""Fixtures for BOOM integration tests.

These fixtures hit the live BOOM API (via SkyPortal's `@boom_available`
endpoints), so they require a running boom-api-1 service. Any test that
uses them will fail at fixture setup if BOOM is unreachable.
"""

import uuid

import pytest

from skyportal.tests import api


@pytest.fixture
def boom_ztf_stream(super_admin_token, public_stream):
    """Decorate `public_stream` with ZTF_alerts altdata so that BOOM
    filters can be attached to it. BOOM derives the survey/permissions
    from `stream.altdata.collection` and `stream.altdata.selector`.
    """
    status, data = api(
        "PATCH",
        f"streams/{public_stream.id}",
        data={
            "name": str(uuid.uuid4()),
            "altdata": {"collection": "ZTF_alerts", "selector": [1, 2]},
        },
        token=super_admin_token,
    )
    assert status == 200, data
    return public_stream


@pytest.fixture
def boom_filter(super_admin_token, boom_ztf_stream, group_with_stream):
    """A SkyPortal Filter provisioned on the BOOM side.

    Two-step setup, mirroring the frontend:
      1. POST /filters to create the SkyPortal-side Filter (no altdata).
      2. POST /boom/filters/{id} which round-trips to BOOM, creates the
         BOOM filter, and populates Filter.altdata with the BOOM filter_id.

    Yields the SkyPortal Filter ID. Best-effort DELETE on teardown.
    """
    status, data = api(
        "POST",
        "filters",
        data={
            "name": str(uuid.uuid4()),
            "stream_id": boom_ztf_stream.id,
            "group_id": group_with_stream.id,
        },
        token=super_admin_token,
    )
    assert status == 200, data
    filter_id = data["data"]["id"]

    pipeline = [{"$match": {"candidate.drb": {"$gt": 0.5}}}]
    status, data = api(
        "POST",
        f"boom/filters/{filter_id}",
        data={
            "name": f"boom_filter_{filter_id}",
            "altdata": pipeline,
            "filters": "v1",
        },
        token=super_admin_token,
    )
    assert status == 200, data

    yield filter_id

    api("DELETE", f"boom/filters/{filter_id}", token=super_admin_token)


@pytest.fixture
def boom_filter_module_block(super_admin_token):
    """Insert a sample BOOM filter-module block into the MongoDB store.

    `BoomFilterModulesHandler` exposes no DELETE, so the block leaks; we
    use a UUID-suffixed name to avoid collisions across test runs.
    """
    name = f"test_block_{uuid.uuid4().hex[:8]}"
    payload = {
        "elements": "blocks",
        "data": {
            "block": {"$match": {"candidate.drb": {"$gt": 0.5}}},
            "streams": ["ZTF (1, 2)"],
        },
    }
    status, data = api(
        "POST",
        f"boom/filter_modules/{name}",
        data=payload,
        token=super_admin_token,
    )
    assert status == 200, data
    return name
