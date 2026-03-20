import base64
import gzip
import io
import traceback
from datetime import datetime, timedelta

import matplotlib.pyplot as plt
import numpy as np
import requests
import sqlalchemy as sa
from astropy.io import fits
from astropy.visualization import (
    AsymmetricPercentileInterval,
    ImageNormalize,
    LinearStretch,
    LogStretch,
)
from scipy.ndimage import rotate
from sqlalchemy.orm.session import Session

from baselayer.app.access import permissions
from baselayer.app.env import load_env
from baselayer.log import make_log

from ....models import (
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
from ...base import BaseHandler
from ..photometry import add_external_photometry
from ..thumbnail import post_thumbnail

thumbnail_types = [
    ("cutoutScience", "new"),
    ("cutoutTemplate", "ref"),
    ("cutoutDifference", "sub"),
]


def make_thumbnail(
    obj_id, cutout_data, cutout_type: str, thumbnail_type: str, survey: str
):
    rotpa = None
    if isinstance(cutout_data, list):
        # DEBUG, save it to disk as a fits.gz file to check it looks correct
        with open(f"cutout_{obj_id}_{cutout_type}.fits.gz", "wb") as f:
            f.write(bytes(cutout_data))
        # looks like we got it as an array of u8 instead of a bytes object, let's convert it to bytes
        cutout_data = bytes(cutout_data)
    if survey == "LSST":  # LSST uses no compression
        with fits.open(io.BytesIO(cutout_data), ignore_missing_simple=True) as hdu:
            rotpa = hdu[0].header.get("ROTPA", None)
            data = hdu[0].data
    else:
        with (
            gzip.open(io.BytesIO(cutout_data), "rb") as f,
            fits.open(io.BytesIO(f.read()), ignore_missing_simple=True) as hdu,
        ):
            rotpa = hdu[0].header.get("ROTPA", None)
            data = hdu[0].data

    buff = io.BytesIO()
    plt.close("all")
    fig = plt.figure()
    fig.set_size_inches(4, 4, forward=False)
    ax = plt.Axes(fig, [0.0, 0.0, 1.0, 1.0])
    ax.set_axis_off()
    fig.add_axes(ax)

    # Clean the data
    img = np.array(data)
    xl = np.greater(np.abs(img), 1e20, where=~np.isnan(img))
    if img[xl].any():
        img[xl] = np.nan
    if np.isnan(img).any():
        median = float(np.nanmean(img.flatten()))
        img = np.nan_to_num(img, nan=median)

    # Normalize
    stretch = LinearStretch() if cutout_type == "cutoutDifference" else LogStretch()
    norm = ImageNormalize(img, stretch=stretch)
    img_norm = norm(img)

    normalizer = AsymmetricPercentileInterval(lower_percentile=1, upper_percentile=100)
    vmin, vmax = normalizer.get_limits(img_norm)

    # Survey-specific transformations to get North up and West on the right
    if survey == "ZTF":
        # flip the image in the vertical direction
        img_norm = np.flipud(img_norm)
    elif survey == "LSST" and rotpa is not None:
        try:
            # Rotate clockwise by ROTPA degrees, reshape to avoid cropping, fill blanks with 0
            img_norm = rotate(
                img_norm,
                -rotpa,
                reshape=True,
                order=1,
                mode="constant",
                cval=0.0,
            )
        except Exception as e:
            # If scipy is not available or rotation fails, skip rotation
            log(f"Failed to rotate LSST image for obj_id {obj_id}: {e}")

    ax.imshow(img_norm, cmap="bone", origin="lower", vmin=vmin, vmax=vmax)

    plt.savefig(buff, format="png", dpi=42)

    buff.seek(0)
    plt.close("all")

    thumbnail_dict = {
        "obj_id": obj_id,
        "data": base64.b64encode(buff.read()).decode("utf-8"),
        "ttype": thumbnail_type,
    }

    return thumbnail_dict


def add_thumbnails(alert, survey, session):
    for cutout_type, thumbnail_type in thumbnail_types:
        if cutout_type not in alert:
            log(f"Cutout key {cutout_type} not found in alert")
            continue
        try:
            thumbnail = make_thumbnail(
                alert["objectId"],
                alert[cutout_type],
                cutout_type,
                thumbnail_type,
                survey,
            )
        except Exception as e:
            traceback.print_exc()
            log(f"Failed to create thumbnail for cutout type {cutout_type}: {e}")
            continue
        post_thumbnail(thumbnail, user_id=1, session=session)


ZP_PER_SURVEY = {"LSST": 8.9, "ZTF": 23.9}

log = make_log("api/boom_alerts")

_, cfg = load_env()


def get_boom_url():
    try:
        ports_to_ignore = [443, 80]
        return f"{cfg['boom.protocol']}://{cfg['boom.host']}" + (
            f":{int(cfg['boom.port'])}"
            if (
                isinstance(cfg["boom.port"], int)
                and int(cfg["boom.port"]) not in ports_to_ignore
            )
            else ""
        )
    except Exception as e:
        log(f"Error getting Boom URL: {e}")
        return None


def get_boom_credentials():
    username = cfg["boom.username"]
    password = cfg["boom.password"]
    return {"username": username, "password": password}


boom_url = get_boom_url()
boom_credentials = get_boom_credentials()


def get_boom_token():
    try:
        if boom_url is None:
            return None, None
        auth_url = f"{boom_url}/auth"
        current_time = datetime.utcnow()
        auth_response = requests.post(
            auth_url,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data=boom_credentials,
            timeout=10,  # 10 second timeout for auth request
        )
        auth_response.raise_for_status()
        data = auth_response.json()
        token = data["access_token"]
        expires_at = None
        if data.get("expires_in"):
            expires_in = int(data["expires_in"])
            expires_at = current_time + timedelta(seconds=expires_in)
        return token, expires_at
    except Exception as e:
        log(f"Error getting Boom token: {e}")
        return None, None


boom_token, boom_token_expires_at = get_boom_token()


def boom_available(func):
    def wrapper(*args, **kwargs):
        global boom_url
        global boom_credentials
        # we should have a boom_url
        if boom_url is None or boom_credentials is None:
            raise ValueError("Boom is not available")
        # if we don't have a token or it's about to expire (<30min), get another one
        global boom_token
        global boom_token_expires_at
        if boom_token is None or (
            boom_token_expires_at is not None
            and boom_token_expires_at < datetime.utcnow() + timedelta(seconds=1800)
        ):
            boom_token, boom_token_expires_at = get_boom_token()
        if boom_token is None:
            raise ValueError("Boom is not available")
        return func(*args, **kwargs)

    return wrapper


def make_programid2stream_mapper(session: Session):
    # here we:
    # - get all the streams
    # - each stream has an altdata field that looks like: "`{'collection': 'ZTF_alerts', selector: [1, 2]}`"
    # - using the altdata's content we create a mapper where given a survey name and a programid we get the streams
    # - basically each stream with a given survey name and programid in its selector is associated with a programid
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

    # convert from set to list
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
    survey2instrumentid = {"ZTF": ztf_instrument_id, "LSST": lsst_instrument_id}
    return survey2instrumentid


def process_photometry(
    object_id, survey, data, survey2instrumentid, programid2streamid, user, session
):
    instrument_id = survey2instrumentid.get(survey)
    if instrument_id is None:
        log(f"No instrument found for survey {survey}, skipping photometry")
        raise ValueError(f"No instrument found for survey {survey}")
    zp = ZP_PER_SURVEY.get(survey)
    if zp is None:
        log(f"No zero point found for survey {survey}, skipping photometry")
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
            flux_err = phot.get("psfFluxErr", None) * 1e-9
            if flux is not None and not np.isnan(flux):
                flux = flux * 1e-9
                # if abs(flux) / flux_err <= 3, we set flux to NaN (non detection)
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

    for key, data in photometry_data.items():
        add_external_photometry(data, user, session)


class BoomObjectHandler(BaseHandler):
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

            # validate that all the groups exist in the database
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

            # Retrieve the data
            url = f"{boom_url}/queries/pipeline"
            headers = {"Authorization": f"Bearer {boom_token}"}
            json_data = {
                "catalog_name": f"{str(survey).upper()}_alerts",
                "pipeline": [
                    {"$match": {"objectId": object_id}},
                    # sort by candidate.magpsf ascending (brightest first)
                    {"$sort": {"candidate.magpsf": 1}},
                    # only keep one candidate per object (the brightest one)
                    {"$group": {"_id": "$objectId", "data": {"$first": "$$ROOT"}}},
                    # replace the root with the data field
                    {"$replaceRoot": {"newRoot": "$data"}},
                    # now do a lookup to the {SURVEY}_alerts_aux collection to get the rest of the data
                    {
                        "$lookup": {
                            "from": f"{str(survey).upper()}_alerts_aux",
                            "localField": "objectId",
                            "foreignField": "_id",
                            "as": "aux",
                        }
                    },
                    # unwind the aux array
                    {"$unwind": {"path": "$aux", "preserveNullAndEmptyArrays": True}},
                    # final projection to remove the aux field
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
                "max_time_ms": 30000,  # 30 second timeout
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
                # create the obj and save it to the groups
                obj = Obj(
                    id=data["objectId"],
                    ra=data["candidate"]["ra"],
                    dec=data["candidate"]["dec"],
                    ra_dis=data["candidate"]["ra"],
                    dec_dis=data["candidate"]["dec"],
                    score=data["candidate"].get("drb"),
                    origin=f"BOOM",
                )
                session.add(obj)
                for g in groups:
                    session.add(
                        Source(
                            obj=obj, group=g, saved_by_id=self.associated_user_object.id
                        )
                    )
            else:
                # if the obj already exists, we just save it to new groups if any
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

            # Grab and insert cutouts, if they don't already exist for this object in the database.
            existing_cutouts = session.scalars(
                sa.select(Thumbnail.type).where(
                    Thumbnail.obj_id == data["objectId"],
                    Thumbnail.type.in_([t[1] for t in thumbnail_types]),
                )
            ).all()
            if len(existing_cutouts) < len(thumbnail_types):
                # for new objects, we use the /queries/find endpoint to get the cutouts
                cutout_url = f"{boom_url}/queries/find"
                cutout_json_data = {
                    "catalog_name": f"{str(survey).upper()}_alerts_cutouts",
                    "filter": {"_id": data["_id"]},
                    "max_time_ms": 30000,  # 30 second timeout
                }
                cutout_response = requests.post(
                    cutout_url, headers=headers, json=cutout_json_data
                )
                if cutout_response.status_code != 200:
                    log(
                        f"Error querying Boom API for cutouts: {cutout_response.status_code} {cutout_response.text}"
                    )
                else:
                    cutout_data = cutout_response.json().get("data", [])
                    if len(cutout_data) > 0:
                        cutout_data[0]["objectId"] = object_id
                        add_thumbnails(cutout_data[0], survey, session)
                    else:
                        log(
                            f"No cutout data found for object {object_id} in survey {survey}"
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

            # at the coordinates of obj, query the other survey's alerts to see if there's a match within 1 arcsec, if so add photometry from that survey as well
            other_survey = "LSST" if survey == "ZTF" else "ZTF"
            other_url = f"{boom_url}/queries/cone_search"
            other_json_data = {
                "catalog_name": f"{str(other_survey).upper()}_alerts_aux",
                "object_coordinates": {
                    object_id: [data["candidate"]["ra"], data["candidate"]["dec"]]
                },
                "radius": 2,  # 1 arcsec
                "unit": "Arcseconds",
                "max_time_ms": 30000,  # 30 second timeout
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
                    other_alert = other_data[object_id][0]  # take the closest match
                    print(
                        f"Found a match for object {object_id} in survey {other_survey} ({other_alert['_id']}), adding object and photometry from that survey"
                    )
                    existing_obj = session.scalar(
                        sa.select(Obj).where(Obj.id == other_alert["_id"])
                    )
                    if not existing_obj:
                        print(
                            f"Object {other_alert['_id']} not found in database, creating it"
                        )
                        other_obj = Obj(
                            id=other_alert["_id"],
                            ra=other_alert["coordinates"]["radec_geojson"][
                                "coordinates"
                            ][0]
                            + 180,  # go from GeoJSON (-180 to 180) to RA (0 to 360)
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
                            origin=f"BOOM",
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

                    # if there isn't one already, we create a SuperObj and associate both the ZTF and LSST Obj with it, so that in the future we can easily query all associated objects across surveys
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
                        session.flush()  # to get the superobj.id
                        association1 = ObjToSuperObj(
                            obj_id=data["objectId"], super_obj_id=superobj.id
                        )
                        association2 = ObjToSuperObj(
                            obj_id=other_alert["_id"], super_obj_id=superobj.id
                        )
                        session.add_all([association1, association2])

            session.commit()

        return self.success({"survey": survey, "objectId": object_id})
