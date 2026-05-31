import traceback

import numpy as np
import requests
import sqlalchemy as sa
from sqlalchemy.orm.session import Session

from baselayer.app.access import auth_or_token, permissions
from baselayer.app.flow import Flow
from baselayer.log import make_log

from ....models import (
    DBSession,
    Group,
    Instrument,
    Obj,
    ObjToSuperObj,
    Source,
    Stream,
    SuperObj,
    Thumbnail,
    User,
)
from ....utils.asynchronous import run_async
from ....utils.parse import str_to_bool
from ...base import BaseHandler
from ..photometry import add_external_photometry
from .utils import (
    add_thumbnails,
    boom_available,
    boom_token,
    boom_url,
    thumbnail_types,
)

log = make_log("api/boom/object")

ZP_PER_SURVEY = {"LSST": 8.9, "ZTF": 23.9}


def fetch_and_add_thumbnails(obj_id, survey, headers, obj_internal_key=None):
    with DBSession() as session:
        try:
            existing_thumbnails = session.scalars(
                sa.select(Thumbnail).where(Thumbnail.obj_id == obj_id)
            ).all()
            existing_thumbnail_types = {t.type for t in existing_thumbnails}
            if all(t in existing_thumbnail_types for t in ["new", "ref", "sub"]):
                return
            cutouts_response = requests.get(
                f"{boom_url}/surveys/{survey.upper()}/cutouts",
                headers=headers,
                params={"objectId": obj_id, "which": "brightest"},
                timeout=30,
            )
            if cutouts_response.status_code != 200:
                log(
                    f"Error querying Boom API for cutouts: {cutouts_response.status_code} {cutouts_response.text}"
                )
                return
            cutout_data = cutouts_response.json().get("data", {})
            if not cutout_data:
                log(f"No cutout data found for object {obj_id} in survey {survey}")
                return
            cutout_data["objectId"] = obj_id
            add_thumbnails(cutout_data, survey, session)
            session.commit()
        except Exception as e:
            log(f"Failed to fetch or add thumbnails for obj_id {obj_id}: {e}")
            traceback.print_exc()

    if obj_internal_key is not None:
        try:
            flow = Flow()
            flow.push(
                "*",
                "skyportal/REFRESH_SOURCE",
                payload={"obj_key": obj_internal_key},
            )
        except Exception as e:
            log(f"Failed to send notification: {e}")


def make_programid2stream_mapper(session: Session):
    streams = session.scalars(sa.select(Stream)).all()
    mapper = {}
    for stream in streams:
        altdata = stream.altdata
        if altdata is None or "collection" not in altdata or "selector" not in altdata:
            continue
        survey = altdata["collection"].split("_")[0]
        programid = max(altdata["selector"])
        key = (survey, programid)
        if key not in mapper:
            mapper[key] = set()
        mapper[(survey, programid)].add(stream.id)
    for key in mapper:
        mapper[key] = list(mapper[key])
    return mapper


def make_survey2instrumentid(session: Session):
    ztf_instrument_id = session.scalar(
        sa.select(Instrument.id).where(Instrument.name == "ZTF")
    )
    if ztf_instrument_id is None:
        raise ValueError("Instrument ZTF not found in the database")
    lsst_instrument_id = session.scalar(
        sa.select(Instrument.id).where(Instrument.name == "LSST")
    )
    if lsst_instrument_id is None:
        raise ValueError("Instrument LSST not found in the database")
    return {"ZTF": ztf_instrument_id, "LSST": lsst_instrument_id}


def build_photometry_groups(
    object_id, survey, data, survey2instrumentid, programid2streamid
):
    """Transform raw BOOM arrays into per-(survey, programid) photometry groups.

    Each group holds SkyPortal-unit arrays (MJD, Jy flux, AB) plus the
    ``stream_ids`` that gate its visibility. This is the single shared source of
    the unit conversions and the programid->stream mapping, used by both the
    persisting path (:func:`process_photometry`) and the ephemeral
    broker-canonical passthrough cache, so the two can never drift — which is
    what keeps the passthrough's access-scope filtering faithful to what the
    persisted rows would have been.
    """
    instrument_id = survey2instrumentid.get(survey)
    if instrument_id is None:
        raise ValueError(f"No instrument found for survey {survey}")
    zp = ZP_PER_SURVEY.get(survey)
    if zp is None:
        raise ValueError(f"No zero point found for survey {survey}")

    photometry_data = {}
    for array_name in ["prv_candidates", "prv_nondetections", "fp_hists"]:
        phot_array = data.get(array_name)
        if phot_array is None:
            continue
        for phot in phot_array:
            programid = phot["programid"] if survey == "ZTF" else 1
            key = (survey, programid)
            if key not in photometry_data:
                stream_ids = programid2streamid.get(key)
                if stream_ids is None:
                    log(
                        f"No stream found for survey {survey} and programid {programid}, skipping photometry"
                    )
                    continue
                photometry_data[key] = {
                    "obj_id": object_id,
                    "stream_ids": stream_ids,
                    "instrument_id": instrument_id,
                    "mjd": [],
                    "flux": [],
                    "fluxerr": [],
                    "filter": [],
                    "zp": [],
                    "magsys": [],
                    "ra": [],
                    "dec": [],
                }

            photometry_data[key]["mjd"].append(phot["jd"] - 2400000.5)
            flux = phot.get("psfFlux", None)
            flux_err = phot.get("psfFluxErr", None)
            if flux_err is None:
                continue  # photometry with missing flux error is not usable
            flux_err = flux_err * 1e-9
            if flux is not None and not np.isnan(flux):
                flux = flux * 1e-9
                if (
                    flux_err is not None
                    and not np.isnan(flux_err)
                    and abs(flux) / flux_err <= 3
                ):
                    flux = np.nan
            photometry_data[key]["flux"].append(flux)
            photometry_data[key]["fluxerr"].append(flux_err)
            photometry_data[key]["filter"].append(
                f"{str(survey).lower()}{str(phot['band']).lower()}"
            )
            photometry_data[key]["zp"].append(zp)
            photometry_data[key]["magsys"].append("ab")
            photometry_data[key]["ra"].append(phot.get("ra"))
            photometry_data[key]["dec"].append(phot.get("dec"))

    return photometry_data


def process_photometry(
    object_id, survey, data, survey2instrumentid, programid2streamid, user, session
):
    """Transform raw BOOM arrays and persist them to Postgres."""
    photometry_data = build_photometry_groups(
        object_id, survey, data, survey2instrumentid, programid2streamid
    )
    for _key, group in photometry_data.items():
        add_external_photometry(group, user, session)


class BoomObjectHandler(BaseHandler):
    @auth_or_token
    @boom_available
    async def get(self, survey: str, object_id: str):
        """
        ---
        summary: Retrieve object-level data for an objectId from Boom
        description: |
          Retrieves object-level auxiliary data for a given objectId from Boom.
          Data is fetched from the `<SURVEY>_alerts_aux` collection, which stores
          one document per object and contains previous candidates,
          forced-photometry history, non-detections, and cross-matches.
          Also appends the most recent alert detection(s) from the alerts
          collection when they are absent from prv_candidates.
        tags:
          - alerts
          - boom
        parameters:
          - in: path
            name: survey
            required: true
            schema:
              type: string
            description: Survey name (e.g. ZTF, LSST)
          - in: path
            name: object_id
            required: true
            schema:
              type: string
          - in: query
            name: includePrvCandidates
            required: false
            schema:
              type: boolean
            default: true
          - in: query
            name: includeFpHists
            required: false
            schema:
              type: boolean
            default: true
          - in: query
            name: includePrvNondetections
            required: false
            schema:
              type: boolean
            default: true
          - in: query
            name: includeAllFields
            required: false
            schema:
              type: boolean
            default: false
        responses:
          200:
            description: retrieved object-level data
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
        try:
            survey = str(survey)
            object_id = str(object_id)
        except ValueError:
            return self.error(
                f"Invalid survey or object_id: {survey}, {object_id}. Must be strings."
            )

        include_prv_candidates = str_to_bool(
            self.get_query_argument("includePrvCandidates", "true"), default=True
        )
        include_fp_hists = str_to_bool(
            self.get_query_argument("includeFpHists", "true"), default=True
        )
        include_prv_nondetections = str_to_bool(
            self.get_query_argument("includePrvNondetections", "true"), default=True
        )
        include_all_fields = str_to_bool(
            self.get_query_argument("includeAllFields", "false").lower(), default=False
        )

        headers = {"Authorization": f"Bearer {boom_token}"}
        catalog_aux = f"{survey.upper()}_alerts_aux"

        try:
            aux_pipeline = [{"$match": {"_id": object_id}}]
            if not include_all_fields:
                aux_pipeline.append(
                    {
                        "$project": {
                            "_id": 1,
                            "cross_matches": 1,
                            "prv_candidates.candid": 1,
                            "prv_candidates.jd": 1,
                            "prv_candidates.band": 1,
                            "prv_candidates.programid": 1,
                            "prv_candidates.ra": 1,
                            "prv_candidates.dec": 1,
                            "prv_candidates.magpsf": 1,
                            "prv_candidates.sigmapsf": 1,
                            "prv_candidates.diffmaglim": 1,
                            "prv_candidates.isdiffpos": 1,
                            "prv_candidates.snr_psf": 1,
                            "fp_hists.jd": 1,
                            "fp_hists.band": 1,
                            "fp_hists.programid": 1,
                            "fp_hists.ra": 1,
                            "fp_hists.dec": 1,
                            "fp_hists.magpsf": 1,
                            "fp_hists.sigmapsf": 1,
                            "fp_hists.diffmaglim": 1,
                            "fp_hists.isdiffpos": 1,
                            "fp_hists.snr_psf": 1,
                            "prv_nondetections.jd": 1,
                            "prv_nondetections.band": 1,
                            "prv_nondetections.programid": 1,
                            "prv_nondetections.diffmaglim": 1,
                        }
                    }
                )

            aux_response = requests.post(
                f"{boom_url}/queries/pipeline",
                headers=headers,
                json={
                    "catalog_name": catalog_aux,
                    "pipeline": aux_pipeline,
                    "max_time_ms": 10000,
                },
                timeout=15,
            )
            if aux_response.status_code != 200:
                return self.error(
                    f"Boom aux query failed: {aux_response.status_code} {aux_response.text}"
                )

            aux_records = aux_response.json().get("data", [])
            if len(aux_records) > 0:
                aux_data = aux_records[0]
            else:
                aux_data = {
                    "prv_candidates": [],
                    "fp_hists": [],
                    "prv_nondetections": [],
                    "cross_matches": {},
                    "missing": True,
                    "message": (
                        "Aux data for this object is missing from Boom. "
                        "Use alert data directly to retrieve detections."
                    ),
                }

            all_ras = [
                c["ra"]
                for c in aux_data.get("prv_candidates", [])
                if c.get("ra") is not None
            ]
            all_decs = [
                c["dec"]
                for c in aux_data.get("prv_candidates", [])
                if c.get("dec") is not None
            ]
            if all_ras and all_decs:
                aux_data["coordinates"] = {
                    "ra_median": float(
                        np.median(np.unique(np.array(all_ras).round(decimals=10)))
                    ),
                    "dec_median": float(
                        np.median(np.unique(np.array(all_decs).round(decimals=10)))
                    ),
                }

            if not include_prv_candidates:
                aux_data.pop("prv_candidates", None)
            if not include_fp_hists:
                aux_data.pop("fp_hists", None)
            if not include_prv_nondetections:
                aux_data.pop("prv_nondetections", None)

            return self.success(data=aux_data)

        except Exception:
            _err = traceback.format_exc()
            return self.error(f"failure: {_err}")

    @permissions(["Upload data"])
    @boom_available
    def post(self, survey, object_id):
        """
        ---
        summary: Import an alert from Boom for a given survey and object ID
        description: Import an alert from Boom for a given survey and object ID
        tags:
            - alerts
            - boom
        """
        try:
            survey = str(survey)
            object_id = str(object_id)
        except ValueError:
            return self.error(
                f"Invalid survey or object_id: {survey}, {object_id}. Must be strings."
            )

        data = self.get_json()
        group_ids = data.pop("group_ids", None)
        try:
            group_ids = [int(gid) for gid in group_ids]
        except Exception:
            return self.error(
                "Invalid `group_ids` parameter. Must be a list of integers."
            )

        with self.Session() as session:
            if not self.associated_user_object.is_admin:
                accessible_groups = [
                    g.id for g in self.associated_user_object.accessible_groups
                ]
                if not all(gid in accessible_groups for gid in group_ids):
                    return self.error(
                        "You do not have access to all the groups provided in `group_ids`."
                    )

            groups = session.scalars(
                sa.select(Group).where(Group.id.in_(group_ids))
            ).all()
            if len(groups) != len(group_ids):
                existing_group_ids = {g.id for g in groups}
                missing_group_ids = [
                    gid for gid in group_ids if gid not in existing_group_ids
                ]
                return self.error(
                    f"The following group IDs do not exist (or are not accessible): {missing_group_ids}"
                )

            user = session.scalar(sa.select(User).where(User.id == 1))
            if user is None:
                log("User with id 1 not found in the database")
                return self.error("Internal error: admin user not found")
            survey2instrumentid = make_survey2instrumentid(session)
            programid2streamid = make_programid2stream_mapper(session)

            url = f"{boom_url}/queries/pipeline"
            headers = {"Authorization": f"Bearer {boom_token}"}
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
            response = requests.post(url, headers=headers, json=json_data)
            if response.status_code != 200:
                log(f"Error querying Boom API: {response.status_code} {response.text}")
                return self.error(
                    f"Error querying Boom API: {response.status_code} {response.text}"
                )
            if "data" not in response.json() or len(response.json()["data"]) == 0:
                log(f"No data found for object {object_id} in survey {survey}")
                return self.error(
                    f"No data found for object {object_id} in survey {survey}"
                )

            data = response.json()["data"][0]

            obj = session.scalar(sa.select(Obj).where(Obj.id == data["objectId"]))
            if not obj:
                obj = Obj(
                    id=data["objectId"],
                    ra=data["candidate"]["ra"],
                    dec=data["candidate"]["dec"],
                    ra_dis=data["candidate"]["ra"],
                    dec_dis=data["candidate"]["dec"],
                    score=data["candidate"].get("drb"),
                    origin="BOOM",
                )
                session.add(obj)
                for g in groups:
                    session.add(
                        Source(
                            obj=obj, group=g, saved_by_id=self.associated_user_object.id
                        )
                    )
            else:
                existing_sources = session.scalars(
                    sa.select(Source).where(
                        Source.obj_id == obj.id, Source.group_id.in_(group_ids)
                    )
                ).all()
                existing_group_ids = {s.group_id for s in existing_sources}
                new_groups = [g for g in groups if g.id not in existing_group_ids]
                for g in new_groups:
                    session.add(
                        Source(
                            obj=obj, group=g, saved_by_id=self.associated_user_object.id
                        )
                    )

            process_photometry(
                object_id,
                survey,
                data,
                survey2instrumentid,
                programid2streamid,
                user,
                session,
            )

            other_obj = None
            other_survey = "LSST" if survey == "ZTF" else "ZTF"
            other_url = f"{boom_url}/queries/cone_search"
            other_json_data = {
                "catalog_name": f"{str(other_survey).upper()}_alerts_aux",
                "object_coordinates": {
                    object_id: [data["candidate"]["ra"], data["candidate"]["dec"]]
                },
                "radius": 2,
                "unit": "Arcseconds",
                "max_time_ms": 30000,
            }
            other_response = requests.post(
                other_url, headers=headers, json=other_json_data
            )
            if other_response.status_code != 200:
                log(
                    f"Error querying Boom API for matching surveys' photometry: {other_response.status_code} {other_response.text}"
                )
                return self.error(
                    f"Error querying Boom API for matching surveys' photometry: {other_response.status_code} {other_response.text}"
                )
            else:
                other_data = other_response.json().get("data", {})
                if object_id in other_data and len(other_data[object_id]) > 0:
                    other_alert = other_data[object_id][0]
                    existing_obj = session.scalar(
                        sa.select(Obj).where(Obj.id == other_alert["_id"])
                    )
                    if not existing_obj:
                        other_obj = Obj(
                            id=other_alert["_id"],
                            ra=other_alert["coordinates"]["radec_geojson"][
                                "coordinates"
                            ][0]
                            + 180,
                            dec=other_alert["coordinates"]["radec_geojson"][
                                "coordinates"
                            ][1],
                            ra_dis=other_alert["coordinates"]["radec_geojson"][
                                "coordinates"
                            ][0]
                            + 180,
                            dec_dis=other_alert["coordinates"]["radec_geojson"][
                                "coordinates"
                            ][1],
                            origin="BOOM",
                        )
                        session.add(other_obj)
                    process_photometry(
                        other_alert["_id"],
                        other_survey,
                        other_alert,
                        survey2instrumentid,
                        programid2streamid,
                        user,
                        session,
                    )

                    existing_associations = session.scalars(
                        sa.select(ObjToSuperObj).where(
                            ObjToSuperObj.obj_id.in_(
                                [data["objectId"], other_alert["_id"]]
                            )
                        )
                    ).all()
                    if len(existing_associations) == 0:
                        superobj = SuperObj()
                        session.add(superobj)
                        session.flush()
                        session.add_all(
                            [
                                ObjToSuperObj(
                                    obj_id=data["objectId"], super_obj_id=superobj.id
                                ),
                                ObjToSuperObj(
                                    obj_id=other_alert["_id"], super_obj_id=superobj.id
                                ),
                            ]
                        )

            session.commit()

            obj_internal_key = obj.internal_key
            other_obj_id, other_obj_internal_key = None, None
            if other_obj is not None:
                other_obj_id = other_obj.id
                other_obj_internal_key = other_obj.internal_key

            run_async(
                fetch_and_add_thumbnails, object_id, survey, headers, obj_internal_key
            )
            if other_obj_id is not None:
                run_async(
                    fetch_and_add_thumbnails,
                    other_obj_id,
                    other_survey,
                    headers,
                    other_obj_internal_key,
                )

        return self.success({"survey": survey, "objectId": object_id})
