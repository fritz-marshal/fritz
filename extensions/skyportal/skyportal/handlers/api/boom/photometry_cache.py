"""Helpers for the ephemeral, broker-canonical photometry passthrough.

For display-only views we fetch photometry on demand from the broker, hold it in
a Valkey read-through cache keyed by ``(obj_id, requester_scope)``, and skip the
Postgres write entirely. This module holds the photometry-specific pieces layered
on top of the generic cache (``skyportal.utils.valkey_cache``):

* the cache-key canonicalizers, including the access-scope hash that is the
  no-leakage guarantee;
* the scope filter that drops broker points the requester may not see — applied
  *before* anything is cached, so a cached payload is already scope-correct;
* a flattener that turns the shared transform's per-(survey, programid) groups
  into a flat list of photometry points for the response.

All functions here are pure (no I/O), so the security-critical scope logic is
directly unit-testable.
"""

import hashlib
import json


def _canonical(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def _short_sha(value) -> str:
    return hashlib.sha256(_canonical(value).encode()).hexdigest()[:16]


def scope_hash(user_id, group_ids, stream_ids, is_admin=False) -> str:
    """Hash the access-determining identity that gates *which* photometry a user
    may see.

    Mirrors the row-level-security inputs: the user's id plus their accessible
    group and stream ids (sorted, so membership order is irrelevant). Admins,
    who bypass row filtering, collapse to a single ``"admin"`` bucket.

    Putting this in the cache key is the no-leakage guarantee: a payload cached
    for one access scope can never be served to a different scope (the key
    differs), and a membership change moves the requester to a different key
    automatically — the stale entry simply ages out.
    """
    if is_admin:
        return "admin"
    payload = {
        "u": int(user_id),
        "g": sorted(int(g) for g in (group_ids or [])),
        "s": sorted(int(s) for s in (stream_ids or [])),
    }
    return _short_sha(payload)


def variant_hash(params: dict) -> str:
    """Hash the serialization-shape args (e.g. ``format``/``magsys``/include
    flags) that change *how* a response renders but not *which* rows are
    visible. Kept separate from :func:`scope_hash` so visibility and rendering
    are never conflated."""
    return _short_sha({k: params[k] for k in sorted(params or {})})


def photometry_key(obj_id, scope, variant, version="v1") -> str:
    """Full cache key for an ephemeral photometry payload."""
    return f"photcache:{version}:{obj_id}:{scope}:{variant}"


def obj_prefix(obj_id, version="v1") -> str:
    """Key prefix covering every cached photometry payload for an object, for
    targeted invalidation when that object is mutated."""
    return f"photcache:{version}:{obj_id}:"


def filter_groups_by_streams(groups, accessible_stream_ids, is_admin=False):
    """Drop photometry groups the requester is not permitted to see.

    ``groups`` is the mapping returned by
    ``skyportal...boom.object.build_photometry_groups`` — keyed by
    ``(survey, programid)``, each value carrying the ``stream_ids`` that gate it.
    A group is kept iff the requester is an admin, or at least one of the group's
    ``stream_ids`` is in ``accessible_stream_ids``. This reproduces, before
    caching, the same stream gating the persisted-row query would apply (e.g.
    ZTF partnership vs public programs).
    """
    if is_admin:
        return dict(groups)
    accessible = {int(s) for s in (accessible_stream_ids or [])}
    kept = {}
    for key, group in groups.items():
        group_streams = {int(s) for s in (group.get("stream_ids") or [])}
        if group_streams & accessible:
            kept[key] = group
    return kept


# Fields copied verbatim from each group's parallel arrays into per-point dicts.
_POINT_FIELDS = ("mjd", "flux", "fluxerr", "filter", "zp", "magsys", "ra", "dec")


def _dedup_key(point):
    """Identity of a photometry point for merge deduplication: the same
    observation across the DB and the broker shares (instrument, filter, mjd).
    mjd is rounded to absorb float noise (1e-6 day ~= 0.09 s)."""
    mjd = point.get("mjd")
    return (
        point.get("instrument_id"),
        point.get("filter"),
        round(mjd, 6) if mjd is not None else None,
    )


def merge_photometry_points(db_points, broker_points):
    """Union persisted (DB) photometry with on-demand broker photometry for
    display.

    The DB is authoritative: a broker point that matches a DB point on
    (instrument_id, filter, mjd) is dropped, so the broker only *augments* the
    DB with points not yet saved. DB points keep their identity (e.g. ``id``,
    groups); broker-only points are appended.
    """
    seen = {_dedup_key(p) for p in db_points}
    merged = list(db_points)
    for point in broker_points:
        if _dedup_key(point) not in seen:
            merged.append(point)
    return merged


def groups_to_points(groups):
    """Flatten per-(survey, programid) groups into a flat list of photometry
    points. Each point carries the transform's SkyPortal-unit fields plus the
    ``instrument_id``; ``stream_ids`` are intentionally omitted from the payload
    (they gate visibility but are not display data).
    """
    points = []
    for group in groups.values():
        n = len(group.get("mjd", []))
        instrument_id = group.get("instrument_id")
        for i in range(n):
            point = {field: group[field][i] for field in _POINT_FIELDS}
            point["instrument_id"] = instrument_id
            points.append(point)
    return points
