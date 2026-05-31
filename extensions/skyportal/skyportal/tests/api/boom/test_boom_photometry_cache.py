"""Unit tests for the broker-canonical photometry passthrough helpers.

These cover the pure, security-critical logic with no broker or Valkey: the
access-scope hash (the no-leakage key component), the stream-based scope filter
applied before caching, and the group->points flattener. The handler's live
fetch/cache path is exercised by the API integration tests.
"""

from skyportal.handlers.api.boom.photometry_cache import (
    filter_groups_by_streams,
    groups_to_points,
    merge_photometry_points,
    obj_prefix,
    photometry_key,
    scope_hash,
    variant_hash,
)


def _groups():
    """Two photometry groups for one object: a public-stream group and a
    partnership-stream group (mirrors ZTF public vs partnership programids)."""
    return {
        ("ZTF", 1): {
            "stream_ids": [10],  # public
            "instrument_id": 1,
            "mjd": [59000.0, 59001.0],
            "flux": [5.0, 6.0],
            "fluxerr": [0.1, 0.1],
            "filter": ["ztfg", "ztfg"],
            "zp": [23.9, 23.9],
            "magsys": ["ab", "ab"],
            "ra": [1.0, 1.0],
            "dec": [2.0, 2.0],
        },
        ("ZTF", 2): {
            "stream_ids": [20],  # partnership
            "instrument_id": 1,
            "mjd": [59002.0],
            "flux": [7.0],
            "fluxerr": [0.1],
            "filter": ["ztfr"],
            "zp": [23.9],
            "magsys": ["ab"],
            "ra": [1.0],
            "dec": [2.0],
        },
    }


def test_scope_hash_is_order_independent():
    assert scope_hash(7, [3, 1], [9, 5]) == scope_hash(7, [1, 3], [5, 9])


def test_scope_hash_is_scope_sensitive():
    base = scope_hash(7, [1], [9])
    assert base != scope_hash(8, [1], [9])  # different user
    assert base != scope_hash(7, [1, 2], [9])  # different group set
    assert base != scope_hash(7, [1], [9, 10])  # different stream set


def test_scope_hash_admin_bucket():
    assert scope_hash(7, [1], [9], is_admin=True) == "admin"


def test_variant_hash_separates_shape_from_visibility():
    assert variant_hash({"format": "mag", "magsys": "ab"}) == variant_hash(
        {"magsys": "ab", "format": "mag"}
    )
    assert variant_hash({"format": "mag"}) != variant_hash({"format": "flux"})


def test_filter_keeps_only_accessible_streams():
    """A requester who can see only the public stream must never receive the
    partnership-stream points."""
    kept = filter_groups_by_streams(_groups(), [10], is_admin=False)
    assert set(kept) == {("ZTF", 1)}
    points = groups_to_points(kept)
    assert len(points) == 2
    assert all(p["filter"] == "ztfg" for p in points)


def test_filter_no_streams_sees_nothing():
    assert filter_groups_by_streams(_groups(), [], is_admin=False) == {}


def test_filter_admin_sees_everything():
    kept = filter_groups_by_streams(_groups(), [], is_admin=True)
    assert set(kept) == {("ZTF", 1), ("ZTF", 2)}
    assert len(groups_to_points(kept)) == 3


def test_groups_to_points_shape():
    points = groups_to_points(filter_groups_by_streams(_groups(), [10]))
    assert points[0] == {
        "mjd": 59000.0,
        "flux": 5.0,
        "fluxerr": 0.1,
        "filter": "ztfg",
        "zp": 23.9,
        "magsys": "ab",
        "ra": 1.0,
        "dec": 2.0,
        "instrument_id": 1,
    }
    # stream_ids are visibility gating, not display data — never in the payload.
    assert "stream_ids" not in points[0]


def test_merge_broker_augments_db_and_dedups():
    """DB points are authoritative; a broker point matching a DB point on
    (instrument, filter, mjd) is dropped, broker-only points are appended."""
    db = [
        {"instrument_id": 1, "filter": "ztfg", "mjd": 59000.0, "id": 5},
        {"instrument_id": 1, "filter": "ztfr", "mjd": 59001.0, "id": 6},
    ]
    broker = [
        # duplicate of the first DB point (float noise on mjd) -> dropped
        {"instrument_id": 1, "filter": "ztfg", "mjd": 59000.0000001, "id": None},
        # genuinely new broker point -> kept
        {"instrument_id": 1, "filter": "ztfg", "mjd": 59002.5, "id": None},
    ]
    merged = merge_photometry_points(db, broker)
    assert len(merged) == 3
    # the two DB points are preserved with their ids
    assert [p for p in merged if p.get("id") is not None] == db
    # exactly the new broker point was appended
    appended = [p for p in merged if p.get("id") is None]
    assert len(appended) == 1
    assert appended[0]["mjd"] == 59002.5


def test_merge_empty_halves():
    assert merge_photometry_points([], []) == []
    only_broker = [{"instrument_id": 1, "filter": "ztfg", "mjd": 1.0, "id": None}]
    assert merge_photometry_points([], only_broker) == only_broker
    only_db = [{"instrument_id": 1, "filter": "ztfg", "mjd": 1.0, "id": 5}]
    assert merge_photometry_points(only_db, []) == only_db


def test_key_matches_obj_prefix_for_invalidation():
    key = photometry_key(
        "ZTF1", scope_hash(7, [1], [10]), variant_hash({"format": "mag"})
    )
    assert key.startswith("photcache:v1:ZTF1:")
    assert key.startswith(obj_prefix("ZTF1"))
