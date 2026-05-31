"""Ephemeral, broker-canonical photometry passthrough.

``GET /api/boom/surveys/{survey}/objects/{object_id}/photometry`` serves an
object's photometry for *display-only* views by fetching it on demand from the
broker (BOOM), holding it in a Valkey read-through cache keyed by
``(obj_id, requester_scope)``, and **never** writing to Postgres. This is the
broker-canonical / marshal-as-cache pattern: Postgres stays the system of record
for saved photometry, but transient views (opening a source page, a candidate
cutout) are served straight from the broker via the cache.

Design points:
- The cache key includes a hash of the requester's access scope (groups +
  streams), and broker points are scope-filtered *before* caching, so a cached
  payload is already scope-correct and can never leak across scopes.
- The unit conversions and programid->stream mapping are shared verbatim with
  the persisting path via ``build_photometry_groups`` (see ``object.py``), so the
  passthrough can never drift from what the saved rows would have been.
- The handler is async: scope is resolved on the IO loop via the async session;
  the blocking broker query + transform run in the thread executor; the cache is
  awaited directly. When caching is disabled the request still works — it just
  fetches from the broker every time (still no Postgres write).
"""

import asyncio
import traceback

import requests
import sqlalchemy as sa

from baselayer.app.access import auth_or_token
from baselayer.log import make_log
from skyportal.utils.valkey_cache import get_cache

from ....models import DBSession, Group, Stream
from ...base import BaseHandler
from .object import (
    build_photometry_groups,
    make_programid2stream_mapper,
    make_survey2instrumentid,
)
from .photometry_cache import (
    filter_groups_by_streams,
    groups_to_points,
    photometry_key,
    scope_hash,
    variant_hash,
)
from .utils import boom_available, boom_token, boom_url

log = make_log("api/boom/photometry")


def _fetch_photometry_groups(survey, object_id):
    """Fetch an object's photometry from BOOM and transform it into SkyPortal-unit
    groups, WITHOUT persisting anything.

    Blocking (sync ``requests`` + sync session), so it is invoked from a thread
    executor. Returns the per-(survey, programid) groups from
    :func:`build_photometry_groups`, or None if BOOM has no data for the object.
    """
    with DBSession() as session:
        survey2instrumentid = make_survey2instrumentid(session)
        programid2streamid = make_programid2stream_mapper(session)

    # Same query the persisting POST path uses: pull the latest alert and join in
    # the aux arrays (prv_candidates / fp_hists / prv_nondetections), which carry
    # psfFlux/psfFluxErr that build_photometry_groups needs.
    json_data = {
        "catalog_name": f"{str(survey).upper()}_alerts",
        "pipeline": [
            {"$match": {"objectId": object_id}},
            {"$sort": {"candidate.magpsf": 1}},
            {"$group": {"_id": "$objectId", "data": {"$first": "$$ROOT"}}},
            {"$replaceRoot": {"newRoot": "$data"}},
            {
                "$lookup": {
                    "from": f"{str(survey).upper()}_alerts_aux",
                    "localField": "objectId",
                    "foreignField": "_id",
                    "as": "aux",
                }
            },
            {"$unwind": {"path": "$aux", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "_id": 1,
                    "objectId": 1,
                    "candidate": 1,
                    "prv_candidates": "$aux.prv_candidates",
                    "prv_nondetections": "$aux.prv_nondetections",
                    "fp_hists": "$aux.fp_hists",
                }
            },
        ],
        "max_time_ms": 30000,
    }
    response = requests.post(
        f"{boom_url}/queries/pipeline",
        headers={"Authorization": f"Bearer {boom_token}"},
        json=json_data,
        timeout=30,
    )
    if response.status_code != 200:
        raise RuntimeError(
            f"BOOM query failed: {response.status_code} {response.text}"
        )
    payload = response.json()
    if not payload.get("data"):
        return None
    data = payload["data"][0]
    return build_photometry_groups(
        object_id, survey, data, survey2instrumentid, programid2streamid
    )


class BoomPhotometryHandler(BaseHandler):
    async def _requester_scope(self):
        """Resolve the access scope that gates which photometry this requester
        may see: (user_id, accessible_group_ids, accessible_stream_ids, is_admin).

        Admins bypass row-level filtering, so their group/stream sets are
        irrelevant (and collapse to a shared cache bucket). Uses explicit
        access-controlled selects under the async session to avoid lazy
        relationship loads.
        """
        user = self.associated_user_object
        is_admin = user.is_admin
        if is_admin:
            return user.id, [], [], True
        async with self.AsyncSession() as session:
            group_ids = (
                await session.scalars(
                    Group.select(user).with_only_columns(Group.id)
                )
            ).all()
            stream_ids = (
                await session.scalars(
                    Stream.select(user).with_only_columns(Stream.id)
                )
            ).all()
        return user.id, list(group_ids), list(stream_ids), is_admin

    @auth_or_token
    @boom_available
    async def get(self, survey, object_id):
        """
        ---
        summary: Ephemeral photometry passthrough for an object from Boom
        description: |
          Fetch an object's photometry on demand from the broker and return it
          for display, without persisting it to the database. Backed by a Valkey
          read-through cache keyed by the object and the requester's access
          scope.
        tags:
          - photometry
          - boom
        parameters:
          - in: path
            name: survey
            required: true
            schema:
              type: string
          - in: path
            name: object_id
            required: true
            schema:
              type: string
        responses:
          200:
            content:
              application/json:
                schema:
                  allOf:
                    - $ref: '#/components/schemas/Success'
                    - type: object
                      properties:
                        data:
                          type: object
          400:
            content:
              application/json:
                schema: Error
        """
        survey = str(survey)
        object_id = str(object_id)

        cache = get_cache()
        user_id, group_ids, stream_ids, is_admin = await self._requester_scope()
        key = photometry_key(
            object_id,
            scope_hash(user_id, group_ids, stream_ids, is_admin),
            variant_hash({"format": self.get_query_argument("format", "mag")}),
        )

        cached = await cache.get_json(key)
        if cached is not None:
            return self.success(
                data={"obj_id": object_id, "photometry": cached, "cached": True}
            )

        # Miss: fetch + transform off the IO loop (blocking broker query).
        loop = asyncio.get_event_loop()
        try:
            groups = await loop.run_in_executor(
                None, _fetch_photometry_groups, survey, object_id
            )
        except Exception:
            log(f"passthrough fetch failed for {survey}/{object_id}")
            return self.error(f"failure: {traceback.format_exc()}")

        if groups is None:
            return self.error(
                f"No photometry found for object {object_id} in survey {survey}"
            )

        # Drop points the requester may not see BEFORE caching, so the cached
        # payload is already scope-correct for this scope_hash.
        kept = filter_groups_by_streams(groups, stream_ids, is_admin)
        points = groups_to_points(kept)

        await cache.set_json(key, points)
        return self.success(
            data={"obj_id": object_id, "photometry": points, "cached": False}
        )
