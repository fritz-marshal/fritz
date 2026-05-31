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
from sqlalchemy.orm import joinedload, load_only

from baselayer.app import models as baselayer_models
from baselayer.app.access import auth_or_token
from baselayer.log import make_log
from skyportal.utils.valkey_cache import get_cache

from ....models import DBSession, Group, Instrument, Photometry, PhotStat, Stream
from ....utils.parse import str_to_bool
from ...base import BaseHandler
from ..photometry import serialize, standardize_photometry_data
from .object import (
    build_photometry_groups,
    make_programid2stream_mapper,
    make_survey2instrumentid,
)
from .photometry_cache import (
    filter_groups_by_streams,
    merge_photometry_points,
    photometry_key,
    scope_hash,
    variant_hash,
)
from .utils import boom_available, boom_token, boom_url

# Group keys that form a PhotFluxFlexible payload for standardize_photometry_data
# (everything except stream_ids, which gates visibility, not serialization).
_PAYLOAD_KEYS = (
    "obj_id",
    "instrument_id",
    "mjd",
    "flux",
    "fluxerr",
    "filter",
    "zp",
    "magsys",
    "ra",
    "dec",
)

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
        raise RuntimeError(f"BOOM query failed: {response.status_code} {response.text}")
    payload = response.json()
    if not payload.get("data"):
        return None
    data = payload["data"][0]
    return build_photometry_groups(
        object_id, survey, data, survey2instrumentid, programid2streamid
    )


async def transient_photometry(groups, session):
    """Build *transient* (non-persisted) ``Photometry`` objects from broker
    groups, running each group through the same ``standardize_photometry_data``
    the DB-write path uses so the flux / zeropoint / magsys conversions are
    byte-for-byte identical. Shared by the serialized display points and the
    cache-update PhotStat recompute.
    """
    phots = []
    for group in groups.values():
        payload = {k: group[k] for k in _PAYLOAD_KEYS if k in group}
        df, instrument_cache = await standardize_photometry_data(payload, session)
        for row in df.to_dict("records"):
            phot = Photometry(
                obj_id=row["obj_id"],
                instrument_id=row["instrument_id"],
                mjd=row["mjd"],
                filter=row["filter"],
                ra=row.get("ra"),
                dec=row.get("dec"),
                ra_unc=row.get("ra_unc"),
                dec_unc=row.get("dec_unc"),
                flux=row.get("standardized_flux"),
                fluxerr=row.get("standardized_fluxerr"),
                origin=row.get("origin"),
            )
            # serialize()/PhotStat read phot.instrument; attach the already-loaded
            # instrument from the standardize cache so it needs no DB round-trip.
            instrument = instrument_cache.get(row["instrument_id"])
            if instrument is not None:
                phot.instrument = instrument
            phots.append(phot)
    return phots


async def serialized_broker_points(groups, session, outsys="ab", fmt="mag"):
    """Serialize transient broker Photometry into SkyPortal's photometry display
    shape (the same ``serialize()`` used by ``GET /sources/{id}/photometry``), so
    broker points are shape-identical to DB points and the two can be merged.
    """
    return [
        serialize(
            phot,
            outsys,
            fmt,
            created_at=False,
            groups=False,
            annotations=False,
            owner=False,
            stream=False,
            validation=False,
        )
        for phot in await transient_photometry(groups, session)
    ]


async def update_phot_stat_from_broker(object_id, groups):
    """Recompute the object's PhotStat from DB ∪ all broker photometry and
    persist the summary (never the bulk photometry).

    Fire-and-forget from the read path: it opens its own session, logs and
    swallows any error, and must never affect the photometry response. Built
    from the *full, unfiltered* broker set so the per-object aggregate is
    viewer-independent (it does not depend on the requester's stream access).
    Broker points already saved are deduped out (by instrument/filter/mjd) so
    they are not double-counted against the DB rows.
    """
    try:
        async with baselayer_models.async_plain_session_factory() as session:
            broker_phot = await transient_photometry(groups, session)
            db_phot = list(
                (
                    await session.scalars(
                        sa.select(Photometry).where(Photometry.obj_id == object_id)
                    )
                ).all()
            )
            seen = {
                (p.instrument_id, p.filter, round(p.mjd, 6))
                for p in db_phot
                if p.mjd is not None
            }
            merged = db_phot + [
                p
                for p in broker_phot
                if p.mjd is None
                or (p.instrument_id, p.filter, round(p.mjd, 6)) not in seen
            ]
            if not merged:
                return
            phot_stat = (
                await session.scalars(
                    sa.select(PhotStat).where(PhotStat.obj_id == object_id)
                )
            ).first()
            if phot_stat is None:
                phot_stat = PhotStat(obj_id=object_id)
                session.add(phot_stat)
            phot_stat.full_update(merged)
            await session.commit()
    except Exception:
        log(f"phot_stat broker update failed for {object_id}: {traceback.format_exc()}")


async def db_photometry_points(object_id, user, session, outsys="ab", fmt="mag"):
    """Serialize the object's persisted, access-controlled photometry, using the
    same ``serialize()`` the standard photometry endpoint uses so DB and broker
    points share one shape. Eager-loads the relationships ``serialize()`` reads
    (instrument, groups) to avoid lazy loads under the async session.
    """
    stmt = (
        Photometry.select(user)
        .where(Photometry.obj_id == object_id)
        .options(
            joinedload(Photometry.instrument).load_only(Instrument.name),
            joinedload(Photometry.groups).load_only(
                Group.id, Group.name, Group.nickname, Group.single_user_group
            ),
        )
    )
    phot = (await session.scalars(stmt)).unique().all()
    return [
        serialize(
            p,
            outsys,
            fmt,
            created_at=False,
            groups=True,
            annotations=False,
            owner=False,
            stream=False,
            validation=False,
        )
        for p in phot
    ]


class BoomPhotometryHandler(BaseHandler):
    @auth_or_token
    @boom_available
    async def get(self, survey, object_id):
        """
        ---
        summary: Display photometry for an object (DB + on-demand broker)
        description: |
          Return an object's photometry for display: the persisted,
          access-controlled photometry from the database merged with photometry
          fetched on demand from the broker (deduped by instrument/filter/mjd,
          so the broker only augments saved points). The broker half is held in
          a Valkey read-through cache keyed by the object and the requester's
          access scope, and is never written to the database.
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
                          type: array
                          items:
                            type: object
          400:
            content:
              application/json:
                schema: Error
        """
        survey = str(survey)
        object_id = str(object_id)
        fmt = self.get_query_argument("format", "mag")
        outsys = self.get_query_argument("magsys", "ab")
        # ?refresh=true bypasses a cached broker payload and re-fetches from the
        # broker (then re-caches) — for a user-initiated photometry refresh.
        refresh = str_to_bool(
            self.get_query_argument("refresh", "false"), default=False
        )

        cache = get_cache()
        user = self.associated_user_object

        async with self.AsyncSession() as session:
            # Access scope: the (user, accessible groups, accessible streams)
            # tuple that gates which photometry is visible — part of the cache
            # key, and used to scope-filter broker points before caching. Admins
            # bypass row-level filtering and share one bucket. Explicit selects
            # avoid lazy relationship loads under the async session.
            if user.is_admin:
                user_id, group_ids, stream_ids, is_admin = user.id, [], [], True
            else:
                group_ids = list(
                    (
                        await session.scalars(
                            Group.select(user).with_only_columns(Group.id)
                        )
                    ).all()
                )
                stream_ids = list(
                    (
                        await session.scalars(
                            Stream.select(user).with_only_columns(Stream.id)
                        )
                    ).all()
                )
                user_id, is_admin = user.id, False

            key = photometry_key(
                object_id,
                scope_hash(user_id, group_ids, stream_ids, is_admin),
                variant_hash({"format": fmt, "magsys": outsys}),
            )

            # Broker half — cached per scope. On a miss, fetch on demand off the
            # IO loop, scope-filter, serialize (no Postgres write), and cache. A
            # broker failure degrades to DB-only (the source page still shows
            # saved photometry) rather than erroring — this endpoint backs the
            # source-page lightcurve, so it must not go down with the broker.
            broker_points = None if refresh else await cache.get_json(key)
            if broker_points is None:
                broker_points = []
                loop = asyncio.get_event_loop()
                try:
                    groups = await loop.run_in_executor(
                        None, _fetch_photometry_groups, survey, object_id
                    )
                    # No broker data for the object is fine — DB points still
                    # come back below.
                    kept = filter_groups_by_streams(groups or {}, stream_ids, is_admin)
                    broker_points = await serialized_broker_points(
                        kept, session, outsys=outsys, fmt=fmt
                    )
                    await cache.set_json(key, broker_points)
                    # Fresh broker data in hand: refresh the object's PhotStat
                    # summary (from the full DB ∪ broker set) so listings/scanning
                    # reflect it. Fire-and-forget — never blocks or fails the read.
                    if groups:
                        asyncio.ensure_future(
                            update_phot_stat_from_broker(object_id, groups)
                        )
                except Exception:
                    log(
                        f"passthrough broker fetch failed for {survey}/{object_id}; "
                        f"serving DB photometry only: {traceback.format_exc()}"
                    )
                    broker_points = []

            # DB half — always live and access-controlled. Merge so the broker
            # only augments saved photometry (deduped by instrument/filter/mjd).
            db_points = await db_photometry_points(
                object_id, user, session, outsys=outsys, fmt=fmt
            )
            merged = merge_photometry_points(db_points, broker_points)

        # Return a bare list of points — the same response shape as
        # GET /sources/{id}/photometry — so this endpoint is a drop-in for the
        # source-page photometry fetch.
        return self.success(data=merged)
