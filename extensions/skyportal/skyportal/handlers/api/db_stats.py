import datetime

import sqlalchemy as sa
from astropy.time import Time
from penquins import Kowalski

from baselayer.app.access import permissions
from baselayer.app.env import load_env
from baselayer.log import make_log

from ...models import (
    Annotation,
    Candidate,
    Comment,
    CronJobRun,
    Filter,
    GcnEvent,
    Group,
    Instrument,
    Obj,
    Source,
    SourceView,
    Spectrum,
    Telescope,
    Thumbnail,
    Token,
    User,
)
from ..base import BaseHandler

_, cfg = load_env()
log = make_log("api/db_stats")

try:
    kowalski = Kowalski(
        token=cfg["app.kowalski.token"],
        protocol=cfg["app.kowalski.protocol"],
        host=cfg["app.kowalski.host"],
        port=int(cfg["app.kowalski.port"]),
        timeout=10,
    )
    connection_ok = kowalski.ping()
    log(f"Kowalski connection OK: {connection_ok}")
    if not connection_ok:
        kowalski = None
except Exception as e:
    log(f"Kowalski connection failed: {str(e)}")
    kowalski = None


class StatsHandler(BaseHandler):
    @permissions(["System admin"])
    async def get(self):
        """
        ---
        summary: Retrieve basic DB statistics
        description: Retrieve basic DB statistics
        tags:
          - system_info
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
                          properties:
                            Number of candidates:
                              type: integer
                              description: Number of rows in candidates table
                            Number of objs:
                              type: integer
                              description: Number of rows in objs table
                            Number of sources:
                              type: integer
                              description: Number of rows in sources table
                            Number of photometry:
                              type: integer
                              description: Number of rows in photometry table
                            Number of spectra:
                              type: integer
                              description: Number of rows in spectra table
                            Number of groups:
                              type: integer
                              description: Number of rows in groups table
                            Number of users:
                              type: integer
                              description: Number of rows in users table
                            Number of tokens:
                              type: integer
                              description: Number of rows in tokens table
                            Oldest candidate creation datetime:
                              type: string
                              description: |
                                Datetime string corresponding to created_at column of
                                the oldest row in the candidates table.
                            Newest candidate creation datetime:
                              type: string
                              description: |
                                Datetime string corresponding to created_at column of
                                the newest row in the candidates table.
        """

        if kowalski is None:
            return self.error("Couldn't connect to Kowalski")

        data = {}

        async with self.AsyncSession() as session:
            photometry_count_row = (
                await session.execute(
                    sa.text(
                        "SELECT reltuples::bigint FROM pg_catalog.pg_class WHERE relname = 'photometry'"
                    )
                )
            ).first()
            data["Number of photometry (approx)"] = photometry_count_row[0]

            data["Number of candidates"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Candidate)
            )
            data["Number of sources"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Source)
            )
            data["Number of source views"] = await session.scalar(
                sa.select(sa.func.count()).select_from(SourceView)
            )
            data["Number of objs"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Obj)
            )
            data["Number of spectra"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Spectrum)
            )
            data["Number of groups"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Group)
            )
            data["Number of users"] = await session.scalar(
                sa.select(sa.func.count()).select_from(User)
            )
            data["Number of tokens"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Token)
            )
            data["Number of filters"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Filter)
            )
            data["Number of telescopes"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Telescope)
            )
            data["Number of instruments"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Instrument)
            )
            data["Number of comments"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Comment)
            )
            data["Number of annotations"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Annotation)
            )
            data["Number of thumbnails"] = await session.scalar(
                sa.select(sa.func.count()).select_from(Thumbnail)
            )
            data["Number of GCN events"] = await session.scalar(
                sa.select(sa.func.count()).select_from(GcnEvent)
            )
            data["Latest cron job run times & statuses"] = []
            cron_job_scripts = (
                await session.scalars(sa.select(CronJobRun.script).distinct())
            ).all()
            for script in cron_job_scripts:
                cron_job_run = (
                    await session.scalars(
                        sa.select(CronJobRun)
                        .where(CronJobRun.script == script)
                        .order_by(CronJobRun.created_at.desc())
                    )
                ).first()
                if cron_job_run is None:
                    continue
                data["Latest cron job run times & statuses"].append(
                    {
                        "summary": f"{script} ran at {cron_job_run.created_at} with exit status {cron_job_run.exit_status}",
                        "output": cron_job_run.output[-100:],
                    }
                )

            try:
                query_tns_count = {
                    "query_type": "count_documents",
                    "query": {
                        "catalog": "TNS",
                        "filter": {},
                    },
                }
                response = kowalski.query(query=query_tns_count)
                data["Number of objects in TNS collection"] = response.get(
                    "default"
                ).get("data")

                query_tns_latest_object = {
                    "query_type": "find",
                    "query": {
                        "catalog": "TNS",
                        "filter": {},
                        "projection": {"_id": 0, "discovery_date_(ut)": 1},
                    },
                    "kwargs": {"sort": [("discovery_date", -1)], "limit": 1},
                }
                response = kowalski.query(query=query_tns_latest_object)
                response_data = response.get("default").get("data", [])
                latest_tns_object_discovery_date = (
                    response_data[0]["discovery_date_(ut)"]
                    if len(response_data) > 0
                    else None
                )
                data["Latest object from TNS collection discovery date (UTC)"] = (
                    latest_tns_object_discovery_date
                )

                for survey in ("WNTR", "PGIR", "ZTF"):
                    utc_now = datetime.datetime.utcnow()
                    jd_start = Time(
                        datetime.datetime(utc_now.year, utc_now.month, utc_now.day)
                    ).jd
                    query_alerts_count = {
                        "query_type": "count_documents",
                        "query": {
                            "catalog": f"{survey}_alerts",
                            "filter": {
                                "candidate.jd": {
                                    "$gt": jd_start - 1,
                                    "$lt": jd_start,
                                }
                            },
                        },
                    }
                    response = kowalski.query(query=query_alerts_count)
                    data[f"Number of {survey} alerts ingested yesterday (UTC)"] = (
                        response.get("default").get("data")
                    )

                    query_alerts_count = {
                        "query_type": "count_documents",
                        "query": {
                            "catalog": f"{survey}_alerts",
                            "filter": {
                                "candidate.jd": {
                                    "$gt": jd_start,
                                }
                            },
                        },
                    }
                    response = kowalski.query(query=query_alerts_count)
                    data[f"Number of {survey} alerts ingested since 0h UTC today"] = (
                        response.get("default").get("data")
                    )
            except Exception as e:
                log(f"kowalski stats query failed: {str(e)}")

        return self.success(data=data)
