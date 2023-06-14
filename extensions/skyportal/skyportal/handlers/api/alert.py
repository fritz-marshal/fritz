from astropy.io import fits
from astropy.visualization import (
    MinMaxInterval,
    AsymmetricPercentileInterval,
    ZScaleInterval,
    AsinhStretch,
    LinearStretch,
    LogStretch,
    SqrtStretch,
    ImageNormalize,
)
import base64
import bson.json_util as bj
import gzip
import io
import json
from marshmallow.exceptions import ValidationError
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pathlib
from penquins import Kowalski
import sqlalchemy as sa
import traceback

from baselayer.app.access import auth_or_token, permissions
from baselayer.app.env import load_env
from baselayer.log import make_log
from ..base import BaseHandler
from ...models import (
    Group,
    GroupStream,
    Instrument,
    Obj,
    Stream,
    Source,
    User,
)
from ...utils.thumbnail import post_thumbnails
from .photometry import add_external_photometry
from .thumbnail import post_thumbnail


alert_available = True

env, cfg = load_env()
log = make_log("alert")


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


INSTRUMENTS = {"ZTF"}

default_projection = {
    "_id": 0,
    "objectId": 1,
    "candid": {"$toString": "$candid"},
    "candidate.ra": 1,
    "candidate.dec": 1,
    "candidate.jd": 1,
    "candidate.fid": 1,
    "candidate.magpsf": 1,
    "candidate.sigmapsf": 1,
    "candidate.isdiffpos": 1,
    "candidate.rb": 1,
    "candidate.drb": 1,
    "candidate.programid": 1,
    "classifications": 1,
    "coordinates.l": 1,
    "coordinates.b": 1,
}


def make_thumbnail(a, ttype, ztftype):

    if "cutout{ztftype}" not in a:
        return None

    cutout_data = a[f"cutout{ztftype}"]["stampData"]
    with gzip.open(io.BytesIO(cutout_data), "rb") as f:
        with fits.open(io.BytesIO(f.read()), ignore_missing_simple=True) as hdu:
            # header = hdu[0].header
            data_flipped_y = np.flipud(hdu[0].data)
    plt.close("all")
    fig = plt.figure()
    fig.set_size_inches(4, 4, forward=False)
    ax = plt.Axes(fig, [0.0, 0.0, 1.0, 1.0])
    ax.set_axis_off()
    fig.add_axes(ax)

    # replace nans with median:
    img = np.array(data_flipped_y)
    # replace dubiously large values
    xl = np.greater(np.abs(img), 1e20, where=~np.isnan(img))
    if img[xl].any():
        img[xl] = np.nan
    if np.isnan(img).any():
        median = float(np.nanmean(img.flatten()))
        img = np.nan_to_num(img, nan=median)

    norm = ImageNormalize(
        img, stretch=LinearStretch() if ztftype == "Difference" else LogStretch()
    )
    img_norm = norm(img)
    normalizer = AsymmetricPercentileInterval(lower_percentile=1, upper_percentile=100)
    vmin, vmax = normalizer.get_limits(img_norm)
    ax.imshow(img_norm, cmap="bone", origin="lower", vmin=vmin, vmax=vmax)
    plt.savefig("temp.png")
    buff = io.BytesIO()
    plt.savefig(buff, format="png", dpi=42)
    plt.close(fig)
    buff.seek(0)

    thumb = {
        "obj_id": a["objectId"],
        "data": base64.b64encode(buff.read()).decode("utf-8"),
        "ttype": ttype,
    }

    return thumb


def post_alert(
    object_id,
    group_ids,
    user_id,
    session,
    program_id_selector=None,
    candid=None,
    thumbnails_only=False,
):
    """Post alert to database.
    object_id : string
        Object ID
    group_ids : array
        Group IDs to save source to. Can alternatively be the string
        'all' to save to all of requesting user's groups.
    user_id : int
        SkyPortal ID of User posting the alert
    session: sqlalchemy.Session
        Database session for this transaction
    program_id_selector : array
        Program IDs to include. Defaults to those accessible to user.
    candid : int
        Alert candid to use to pull thumbnails. Defaults to latest alert.
    thumbnails_only : bool
        Only post thumbnails (no photometry)
    """

    user = session.scalar(sa.select(User).where(User.id == user_id))

    if program_id_selector is None:
        # allow access to public data only by default
        program_id_selector = {1}

        # using self.Session() should attach the
        # associated_user_object to the current session
        # so it can lazy load things like streams
        for stream in user.streams:
            if "ztf" in stream.name.lower():
                program_id_selector.update(set(stream.altdata.get("selector", [])))

        program_id_selector = list(program_id_selector)

    obj = session.scalars(Obj.select(user).where(Obj.id == object_id)).first()
    if obj is None:
        obj_already_exists = False
    else:
        obj_already_exists = True
    instrument = session.scalars(
        Instrument.select(user).where(Instrument.name == "ZTF")
    ).first()

    query = {
        "query_type": "aggregate",
        "query": {
            "catalog": "ZTF_alerts_aux",
            "pipeline": [
                {"$match": {"_id": object_id}},
                {
                    "$project": {
                        "_id": 1,
                        "cross_matches": 1,
                        "prv_candidates": {
                            "$filter": {
                                "input": "$prv_candidates",
                                "as": "item",
                                "cond": {
                                    "$in": [
                                        "$$item.programid",
                                        program_id_selector,
                                    ]
                                },
                            }
                        },
                    }
                },
                {
                    "$project": {
                        "_id": 1,
                        "prv_candidates.magpsf": 1,
                        "prv_candidates.sigmapsf": 1,
                        "prv_candidates.diffmaglim": 1,
                        "prv_candidates.programid": 1,
                        "prv_candidates.fid": 1,
                        "prv_candidates.rb": 1,
                        "prv_candidates.ra": 1,
                        "prv_candidates.dec": 1,
                        "prv_candidates.candid": 1,
                        "prv_candidates.jd": 1,
                    }
                },
            ],
        },
    }

    response = kowalski.query(query=query)
    if response.get("default").get("status", "error") == "success":
        alert_data = response.get("default").get("data")
        if len(alert_data) > 0:
            alert_data = alert_data[0]
        else:
            raise ValueError(f"{object_id} not found on Kowalski")
    else:
        raise ValueError(f"Failed to fetch data for {object_id} from Kowalski")

    # grab and append most recent candid as it may not be in prv_candidates
    query = {
        "query_type": "aggregate",
        "query": {
            "catalog": "ZTF_alerts",
            "pipeline": [
                {
                    "$match": {
                        "objectId": object_id,
                        "candidate.programid": {"$in": program_id_selector},
                    }
                },
                {
                    "$project": {
                        # grab only what's going to be rendered
                        "_id": 0,
                        "candidate.candid": {"$toString": "$candidate.candid"},
                        "candidate.programid": 1,
                        "candidate.jd": 1,
                        "candidate.fid": 1,
                        "candidate.rb": 1,
                        "candidate.drb": 1,
                        "candidate.ra": 1,
                        "candidate.dec": 1,
                        "candidate.magpsf": 1,
                        "candidate.sigmapsf": 1,
                        "candidate.diffmaglim": 1,
                    }
                },
                {"$sort": {"candidate.jd": -1}},
                {"$limit": 1},
            ],
        },
    }

    response = kowalski.query(query=query)
    if response.get("default").get("status", "error") == "success":
        latest_alert_data = response.get("default").get("data")
        if len(latest_alert_data) > 0:
            latest_alert_data = latest_alert_data[0]
    else:
        raise ValueError(f"Failed to fetch data for {object_id} from Kowalski")

    if len(latest_alert_data) > 0:
        latest_alert_data["candidate"]["candid"] = int(
            latest_alert_data["candidate"]["candid"]
        )
        candids = {a.get("candid", None) for a in alert_data["prv_candidates"]}
        if latest_alert_data["candidate"]["candid"] not in candids:
            alert_data["prv_candidates"].append(latest_alert_data["candidate"])

    if candid is None:
        if len(latest_alert_data) == 0:
            raise ValueError("Latest alert data must be present if candid is None")
        candid = int(latest_alert_data["candidate"]["candid"])

    alert = None
    for cand in alert_data["prv_candidates"]:
        if "candid" in cand and str(candid) == str(cand["candid"]):
            alert = cand
            break
    if alert is None:
        raise ValueError(
            f"Could not find {candid} to post alert from {object_id} from Kowalski"
        )
    df = pd.DataFrame.from_records(alert_data["prv_candidates"])

    # post source
    drb = alert.get("drb")
    rb = alert.get("rb")
    score = drb if drb is not None and not np.isnan(drb) else rb
    alert_thin = {
        "id": object_id,
        "ra": alert.get("ra"),
        "dec": alert.get("dec"),
        "score": score,
        "altdata": {
            "passing_alert_id": candid,
        },
    }

    schema = Obj.__schema__()

    user_group_ids = [g.id for g in user.groups]
    user_accessible_group_ids = [g.id for g in user.accessible_groups]
    if not user_group_ids:
        raise AttributeError(
            "You must belong to one or more groups before you can add sources."
        )

    if group_ids == "all":
        group_ids = user_group_ids
    else:
        group_ids = [
            int(id) for id in group_ids if int(id) in user_accessible_group_ids
        ]
    if not group_ids:
        raise AttributeError(
            "Invalid group_ids field. Please specify at least "
            "one valid group ID that you belong to."
        )
    if len(group_ids) == 0:
        raise AttributeError(
            "Invalid group_ids field. Please specify at least "
            "one valid group ID that you belong to."
        )
    try:
        group_ids = [int(_id) for _id in group_ids]
    except ValueError:
        raise ValueError("Invalid group_ids parameter: all elements must be integers.")
    forbidden_groups = list(set(group_ids) - set(user_accessible_group_ids))

    if len(forbidden_groups) > 0:
        raise AttributeError(
            "Insufficient group access permissions. Not a member of "
            f"group IDs: {forbidden_groups}."
        )

    if not obj_already_exists:
        try:
            obj = schema.load(alert_thin)
        except ValidationError as e:
            raise AttributeError(
                f"Invalid/missing parameters: {e.normalized_messages()}"
            )

    groups = session.scalars(Group.select(user).where(Group.id.in_(group_ids))).all()
    if not groups:
        raise AttributeError(
            "Invalid group_ids field. Please specify at least "
            "one valid group ID that you belong to."
        )

    session.add(obj)

    if not thumbnails_only:
        for group in groups:
            source = session.scalars(
                Source.select(user).where(
                    Source.obj_id == object_id, Source.group_id == group.id
                )
            ).first()
            if source is not None:
                source.active = True
                source.saved_by = user
            else:
                session.add(
                    Source(
                        obj=obj,
                        group=group,
                        saved_by_id=user.id,
                    )
                )
        session.commit()
        if not obj_already_exists:
            post_thumbnails([object_id])

        # post photometry
        ztf_filters = {1: "ztfg", 2: "ztfr", 3: "ztfi"}
        df["ztf_filter"] = df["fid"].apply(lambda x: ztf_filters[x])
        df["magsys"] = "ab"
        df["mjd"] = df["jd"] - 2400000.5

        df["mjd"] = df["mjd"].apply(lambda x: np.float64(x))
        df["magpsf"] = df["magpsf"].apply(lambda x: np.float32(x))
        df["sigmapsf"] = df["sigmapsf"].apply(lambda x: np.float32(x))

        # deduplicate
        df = (
            df.drop_duplicates(subset=["mjd", "magpsf"])
            .reset_index(drop=True)
            .sort_values(by=["mjd"])
        )

        # filter out bad data:
        mask_good_diffmaglim = df["diffmaglim"] > 0
        df = df.loc[mask_good_diffmaglim]

        # get group stream access and map it to ZTF alert program ids
        group_stream_access = []
        for group in groups:
            group_stream_subquery = (
                GroupStream.select(user)
                .where(GroupStream.group_id == group.id)
                .subquery()
            )
            group_streams = session.scalars(
                Stream.select(user).join(
                    group_stream_subquery,
                    Stream.id == group_stream_subquery.c.stream_id,
                )
            ).all()
            if group_streams is None:
                group_streams = []

            group_stream_selector = {1}

            for stream in group_streams:
                if "ztf" in stream.name.lower():
                    group_stream_selector.update(
                        set(stream.altdata.get("selector", []))
                    )

            group_stream_access.append(
                {"group_id": group.id, "permissions": list(group_stream_selector)}
            )

        # post data from different program_id's
        photometry_ids = []
        for pid in set(df.programid.unique()):
            group_ids = [
                gsa.get("group_id")
                for gsa in group_stream_access
                if pid in gsa.get("permissions", [1])
            ]

            if len(group_ids) > 0:
                pid_mask = df.programid == int(pid)

                photometry = {
                    "obj_id": object_id,
                    "group_ids": group_ids,
                    "instrument_id": instrument.id,
                    "mjd": df.loc[pid_mask, "mjd"].tolist(),
                    "mag": df.loc[pid_mask, "magpsf"].tolist(),
                    "magerr": df.loc[pid_mask, "sigmapsf"].tolist(),
                    "limiting_mag": df.loc[pid_mask, "diffmaglim"].tolist(),
                    "magsys": df.loc[pid_mask, "magsys"].tolist(),
                    "filter": df.loc[pid_mask, "ztf_filter"].tolist(),
                    "ra": df.loc[pid_mask, "ra"].tolist(),
                    "dec": df.loc[pid_mask, "dec"].tolist(),
                }

                if len(photometry.get("mag", ())) > 0:
                    try:
                        photometry_ids_tmp, _ = add_external_photometry(
                            photometry, user
                        )
                        photometry_ids = photometry_ids + photometry_ids_tmp
                    except Exception:
                        log(
                            f"Failed to post photometry of {object_id} to group_ids {group_ids}"
                        )

    # post cutouts
    thumbnail_ids = []
    for ttype, ztftype in [
        ("new", "Science"),
        ("ref", "Template"),
        ("sub", "Difference"),
    ]:
        query = {
            "query_type": "find",
            "query": {
                "catalog": "ZTF_alerts",
                "filter": {
                    "candid": candid,
                    "candidate.programid": {"$in": program_id_selector},
                },
                "projection": {"_id": 0, "objectId": 1, f"cutout{ztftype}": 1},
            },
            "kwargs": {
                "limit": 1,
            },
        }

        response = kowalski.query(query=query)
        if response.get("default").get("status", "error") == "success":
            cutout = response.get("default").get("data", list(dict()))
            if len(cutout) > 0:
                cutout = cutout[0]
            else:
                cutout = dict()
        else:
            cutout = dict()

        try:
            thumb = make_thumbnail(cutout, ttype, ztftype)
            if thumb is not None:
                thumbnail_id = post_thumbnail(thumb, user_id, session)
                thumbnail_ids.append(thumbnail_id)
        except Exception as e:
            log(f"Failed to post thumbnails of {object_id} | {candid}")
            log(str(e))

    return photometry_ids, thumbnail_ids


def get_alerts_by_id(
    object_id,
    program_id_selector,
    projection=None,
    include_all_fields=False,
    candid=None,
):
    """Get alert from database (by object ID).
    object_id : string
        Object ID
    program_id_selector : List[Int]
        List of Program IDs to query
    projection : List[str]
        List of fields to query from database
    include_all_fields : bool
        Include all available fields in database. Defaults to False.
    candid : Int
        Candidate ID to query
    """

    # grabbing alerts by single objectId
    query = {
        "query_type": "aggregate",
        "query": {
            "catalog": "ZTF_alerts",
            "pipeline": [
                {
                    "$match": {
                        "objectId": object_id,
                        "candidate.programid": {"$in": program_id_selector},
                    }
                },
                {
                    "$project": projection
                    if not include_all_fields
                    else {
                        "_id": 0,
                        "cutoutScience": 0,
                        "cutoutTemplate": 0,
                        "cutoutDifference": 0,
                    }
                },
            ],
        },
        "kwargs": {"max_time_ms": 10000},
    }

    if candid is not None:
        query["query"]["pipeline"][0]["$match"]["candid"] = int(candid)

    response = kowalski.query(query=query)

    if response.get("default").get("status", "error") == "success":
        return response.get("default").get("data")
    else:
        return None


def get_alerts_by_ids(
    object_ids, program_id_selector, projection=None, include_all_fields=False
):
    """Get alert from database (by object IDs).
    object_ids : List[str]
        Object IDs to query
    program_id_selector : List[Int]
        List of Program IDs to query
    projection : List[str]
        List of fields to query from database
    include_all_fields : bool
        Include all available fields in database. Defaults to False.
    """

    # otherwise, run a find query with the specified filter
    query = {
        "query_type": "find",
        "query": {
            "catalog": "ZTF_alerts",
            "filter": {
                "objectId": {"$in": [oid.strip() for oid in object_ids.split(",")]},
                "candidate.programid": {"$in": program_id_selector},
            },
            "projection": projection
            if not include_all_fields
            else {
                "_id": 0,
                "cutoutScience": 0,
                "cutoutTemplate": 0,
                "cutoutDifference": 0,
            },
        },
        "kwargs": {
            "max_time_ms": 10000,
            "limit": 10000,
        },
    }

    response = kowalski.query(query=query)

    if response.get("default").get("status", "error") == "success":
        alert_data = response.get("default").get("data")
        return alert_data
    else:
        return None


def get_alerts_by_position(
    ra,
    dec,
    radius,
    radius_units,
    program_id_selector,
    projection=None,
    include_all_fields=False,
    object_ids=None,
    filter={},
):
    """Get alert from database (by object ID).
    ra : float
        Right Ascension
    dec : float
        Declination
    radius : float
        Radius to search. Units specified by radius_units.
    radius_units : str
        Units of radius variable. Can be deg, arcmin, or arcsec.
    program_id_selector : List[Int]
        List of Program IDs to query
    projection : List[str]
        List of fields to query from database
    include_all_fields : bool
        Include all available fields in database. Defaults to False.
    object_ids : List[str]
        Object IDs to query
    """

    # complete positional arguments? run "near" query
    if radius_units not in ["deg", "arcmin", "arcsec"]:
        return ValueError(
            "Invalid radius_units value. Must be one of either "
            "'deg', 'arcmin', or 'arcsec'."
        )
    try:
        ra = float(ra)
        dec = float(dec)
        radius = float(radius)
    except ValueError:
        return ValueError("Invalid (non-float) value provided.")
    if (
        (radius_units == "deg" and radius > 1)
        or (radius_units == "arcmin" and radius > 60)
        or (radius_units == "arcsec" and radius > 3600)
    ):
        return ValueError("Radius must be <= 1.0 deg")

    query = {
        "query_type": "near",
        "query": {
            "max_distance": radius,
            "distance_units": radius_units,
            "radec": {"query_coords": [ra, dec]},
            "catalogs": {
                "ZTF_alerts": {
                    "filter": {
                        **filter,
                        "candidate.programid": {"$in": program_id_selector},
                    },
                    "projection": projection
                    if not include_all_fields
                    else {
                        "_id": 0,
                        "cutoutScience": 0,
                        "cutoutTemplate": 0,
                        "cutoutDifference": 0,
                    },
                }
            },
        },
        "kwargs": {
            "max_time_ms": 10000,
            "limit": 10000,
        },
    }

    # additional filters?
    if object_ids is not None:
        query["query"]["catalogs"]["ZTF_alerts"]["filter"]["objectId"] = {
            "$in": [oid.strip() for oid in object_ids.split(",")]
        }

    response = kowalski.query(query=query)

    if response.get("default").get("status", "error") == "success":
        alert_data = response.get("default").get("data")
        return alert_data["ZTF_alerts"]["query_coords"]
    else:
        return None


class AlertHandler(BaseHandler):
    @auth_or_token
    async def get(self, object_id: str = None):
        """
        ---
        single:
          description: Retrieve an object from Kowalski by objectId
          tags:
            - alerts
            - kowalski
          parameters:
            - in: path
              name: object_id
              required: true
              schema:
                type: str
            - in: query
              name: instrument
              required: false
              default: 'ZTF'
              schema:
                type: str
            - in: query
              name: candid
              required: false
              schema:
                type: int
            - in: query
              name: includeAllFields
              required: false
              schema:
                type: boolean
          responses:
            200:
              description: retrieved alert(s)
              content:
                application/json:
                  schema:
                    allOf:
                      - $ref: '#/components/schemas/Success'
            400:
              content:
                application/json:
                  schema: Error
        multiple:
          description: Retrieve objects from Kowalski by objectId and or position
          tags:
            - alerts
            - kowalski
          parameters:
            - in: query
              name: objectId
              required: false
              schema:
                type: str
              description: can be a single objectId or a comma-separated list of objectIds
            - in: query
              name: ra
              required: false
              schema:
                type: float
              description: RA in degrees
            - in: query
              name: dec
              required: false
              schema:
                type: float
              description: Dec. in degrees
            - in: query
              name: radius
              required: false
              schema:
                type: float
              description: Max distance from specified (RA, Dec) (capped at 1 deg)
            - in: query
              name: radius_units
              required: false
              schema:
                type: string
              description: Distance units (either "deg", "arcmin", or "arcsec")
            - in: query
              name: includeAllFields
              required: false
              schema:
                type: boolean
          responses:
            200:
              description: retrieved alert(s)
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
        # allow access to public data only by default
        program_id_selector = {1}

        # using self.Session() should attach the
        # associated_user_object to the current session
        # so it can lazy load things like streams
        with self.Session():
            for stream in self.associated_user_object.streams:
                if "ztf" in stream.name.lower():
                    program_id_selector.update(set(stream.altdata.get("selector", [])))

        program_id_selector = list(program_id_selector)

        projection = self.get_query_argument("projection", None)
        if projection:
            try:
                projection = json.loads(projection)
            except Exception as e:
                return self.error(f"projection must be a JSON dictionary: {str(e)}")
        else:
            projection = default_projection

        include_all_fields = self.get_query_argument("includeAllFields", False)
        candid = self.get_query_argument("candid", None)

        if object_id is not None:
            try:
                alert_data = get_alerts_by_id(
                    object_id,
                    program_id_selector,
                    projection,
                    include_all_fields=include_all_fields,
                    candid=candid,
                )
            except Exception as e:
                return self.error(f"Query error: {str(e)}")

            if alert_data is not None:
                return self.success(data=alert_data)
            else:
                return self.error(f"Failed to fetch data for {object_id} from Kowalski")

        # executing a general search
        object_ids = self.get_query_argument(
            "objectId", None
        )  # could be a comma-separated list
        ra = self.get_query_argument("ra", None)
        dec = self.get_query_argument("dec", None)
        radius = self.get_query_argument("radius", None)
        radius_units = self.get_query_argument("radius_units", None)

        position_tuple = (ra, dec, radius, radius_units)

        if not any((object_ids, ra, dec, radius, radius_units)):
            return self.error("Missing required parameters")

        if not all(position_tuple) and any(position_tuple):
            # incomplete positional arguments? throw errors, since
            # either all or none should be provided
            if ra is None:
                return self.error("Missing required parameter: ra")
            if dec is None:
                return self.error("Missing required parameter: dec")
            if radius is None:
                return self.error("Missing required parameter: radius")
            if radius_units is None:
                return self.error("Missing required parameter: radius_units")
        if all(position_tuple):
            try:
                alert_data = get_alerts_by_position(
                    ra,
                    dec,
                    radius,
                    radius_units,
                    program_id_selector,
                    projection=projection,
                    include_all_fields=include_all_fields,
                    object_ids=object_ids,
                )
            except Exception as e:
                return self.error(f"Query error: {str(e)}")

            if alert_data is not None:
                return self.success(data=alert_data)
            else:
                return self.error(
                    f"No data for position {str(position_tuple)} from Kowalski"
                )

        try:
            alert_data = get_alerts_by_ids(
                object_ids,
                program_id_selector,
                projection=projection,
                include_all_fields=include_all_fields,
            )
        except Exception as e:
            return self.error(f"Query error: {str(e)}")

        if alert_data is not None:
            return self.success(data=alert_data)
        else:
            return self.error(f"No data for object IDs {str(object_ids)} from Kowalski")

    @permissions(["Upload data"])
    def post(self, objectId):
        """
        ---
        description: Save ZTF objectId from Kowalski as source in SkyPortal
        tags:
          - alerts
          - kowalski
        requestBody:
          content:
            application/json:
              schema:
                type: object
                properties:
                  candid:
                    type: integer
                    description: Alert candid to use to pull thumbnails. Defaults to latest alert
                    minimum: 1
                  thumbnailsOnly:
                    type: bool
                    description: Only post thumbnails (no photometry)
                    default: False
                  group_ids:
                    type: array
                    items:
                      type: integer
                    description: |
                      Group IDs to save source to. Can alternatively be the string
                      'all' to save to all of requesting user's groups.
                    minItems: 1
                required:
                  - group_ids
        responses:
          200:
            content:
              application/json:
                schema: Success
          400:
            content:
              application/json:
                schema: Error
        """

        data = self.get_json()
        candid = data.get("candid", None)
        group_ids = data.pop("group_ids", None)
        thumbnails_only = data.pop("thumbnailsOnly", False)
        if group_ids is None and not thumbnails_only:
            return self.error("Missing required `group_ids` parameter.")

        with self.Session() as session:

            # allow access to public data only by default
            program_id_selector = {1}

            for stream in self.associated_user_object.streams:
                if "ztf" in stream.name.lower():
                    program_id_selector.update(set(stream.altdata.get("selector", [])))

            program_id_selector = list(program_id_selector)

            try:
                post_alert(
                    objectId,
                    group_ids,
                    self.associated_user_object.id,
                    session,
                    program_id_selector=program_id_selector,
                    candid=candid,
                    thumbnails_only=thumbnails_only,
                )
            except Exception as e:
                return self.error(f"Alert failed to post: {str(e)}")

            self.push_all(action="skyportal/FETCH_SOURCES")
            self.push_all(action="skyportal/FETCH_RECENT_SOURCES")

            return self.success(data={"id": objectId})


class AlertAuxHandler(BaseHandler):
    @auth_or_token
    def get(self, object_id: str = None):
        """
        ---
        single:
          description: Retrieve aux data for an objectId from Kowalski
          tags:
            - alerts
            - kowalski
          parameters:
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
            - in: query
              name: includeAllFields
              required: false
              schema:
                type: boolean
          responses:
            200:
              description: retrieved aux data
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
        # allow access to public data only by default
        selector = {1}
        with self.Session():
            for stream in self.associated_user_object.streams:
                if "ztf" in stream.name.lower():
                    selector.update(set(stream.altdata.get("selector", [])))

        selector = list(selector)

        include_prv_candidates = self.get_query_argument("includePrvCandidates", "true")
        include_prv_candidates = (
            True if include_prv_candidates.lower() == "true" else False
        )
        include_all_fields = self.get_query_argument("includeAllFields", "false")
        include_all_fields = False if include_all_fields.lower() == "false" else True

        try:
            query = {
                "query_type": "aggregate",
                "query": {
                    "catalog": "ZTF_alerts_aux",
                    "pipeline": [
                        {"$match": {"_id": object_id}},
                        {
                            "$project": {
                                "_id": 1,
                                "cross_matches": 1,
                                "prv_candidates": {
                                    "$filter": {
                                        "input": "$prv_candidates",
                                        "as": "item",
                                        "cond": {"$in": ["$$item.programid", selector]},
                                    }
                                },
                            }
                        },
                    ],
                },
            }

            if not include_all_fields:
                query["query"]["pipeline"].append(
                    {
                        "$project": {
                            "_id": 1,
                            "cross_matches": 1,
                            "prv_candidates.magpsf": 1,
                            "prv_candidates.sigmapsf": 1,
                            "prv_candidates.diffmaglim": 1,
                            "prv_candidates.programid": 1,
                            "prv_candidates.fid": 1,
                            "prv_candidates.ra": 1,
                            "prv_candidates.dec": 1,
                            "prv_candidates.candid": 1,
                            "prv_candidates.jd": 1,
                        }
                    }
                )

            response = kowalski.query(query=query)

            if response.get("default").get("status", "error") == "success":
                alert_data = response.get("default").get("data")
                if len(alert_data) > 0:
                    alert_data = alert_data[0]
                else:
                    # len = 0 means that objectId does not exists on Kowalski
                    self.set_status(404)
                    self.finish()
                    return
            else:
                return self.error(response.get("default").get("message"))

            # grab and append most recent candid as it should not be in prv_candidates
            query = {
                "query_type": "aggregate",
                "query": {
                    "catalog": "ZTF_alerts",
                    "pipeline": [
                        {
                            "$match": {
                                "objectId": object_id,
                                "candidate.programid": {"$in": selector},
                            }
                        },
                        {
                            "$project": {
                                # grab only what's going to be rendered
                                "_id": 0,
                                "candidate.candid": {"$toString": "$candidate.candid"},
                                "candidate.programid": 1,
                                "candidate.jd": 1,
                                "candidate.fid": 1,
                                "candidate.ra": 1,
                                "candidate.dec": 1,
                                "candidate.magpsf": 1,
                                "candidate.sigmapsf": 1,
                                "candidate.diffmaglim": 1,
                                "coordinates.l": 1,
                                "coordinates.b": 1,
                            }
                            if not include_all_fields
                            else {
                                "_id": 0,
                                "cutoutScience": 0,
                                "cutoutTemplate": 0,
                                "cutoutDifference": 0,
                            }
                        },
                        {"$sort": {"candidate.jd": -1}},
                        {"$limit": 1},
                    ],
                },
            }

            response = kowalski.query(query=query)

            if response.get("default").get("status", "error") == "success":
                latest_alert_data = response.get("default").get("data", list(dict()))
                if len(latest_alert_data) > 0:
                    latest_alert_data = latest_alert_data[0]
                else:
                    # len = 0 means that user has insufficient permissions to see objectId
                    self.set_status(404)
                    self.finish()
                    return
            else:
                return self.error(response.get("default").get("message"))

            candids = {a.get("candid", None) for a in alert_data["prv_candidates"]}
            if latest_alert_data["candidate"]["candid"] not in candids:
                alert_data["prv_candidates"].append(latest_alert_data["candidate"])

            # cross-match with the TNS
            rads = np.array(
                [
                    candid["ra"]
                    for candid in alert_data["prv_candidates"]
                    if candid.get("ra") is not None
                ]
            )
            decs = np.array(
                [
                    candid["dec"]
                    for candid in alert_data["prv_candidates"]
                    if candid.get("dec") is not None
                ]
            )

            ra = np.median(np.unique(rads.round(decimals=10)))
            dec = np.median(np.unique(decs.round(decimals=10)))
            # save median coordinates
            alert_data["coordinates"] = {
                "ra_median": ra,
                "dec_median": dec,
            }
            query = {
                "query_type": "cone_search",
                "query": {
                    "object_coordinates": {
                        "cone_search_radius": 2,
                        "cone_search_unit": "arcsec",
                        "radec": {object_id: [ra, dec]},
                    },
                    "catalogs": {
                        "TNS": {
                            "filter": {},
                            "projection": {
                                "name": 1,
                                "_id": 1,
                                "disc__instrument/s": 1,
                                "disc__internal_name": 1,
                                "discovery_data_source/s": 1,
                                "discovery_date_(ut)": 1,
                                "discovery_filter": 1,
                                "discovery_mag/flux": 1,
                                "reporting_group/s": 1,
                                "associated_group/s": 1,
                                "public": 1,
                            },
                        }
                    },
                },
                "kwargs": {"filter_first": False},
            }

            response = kowalski.query(query=query)

            if response.get("default").get("status", "error") == "success":
                tns_data = response.get("default").get("data").get("TNS").get(object_id)
                alert_data["cross_matches"]["TNS"] = tns_data

            if not include_prv_candidates:
                alert_data.pop("prv_candidates", None)

            return self.success(data=alert_data)

        except Exception:
            _err = traceback.format_exc()
            return self.error(_err)


class AlertCutoutHandler(BaseHandler):
    @auth_or_token
    async def get(self, object_id: str = None):
        """
        ---
        summary: Serve alert cutout as fits or png
        tags:
          - alerts
          - kowalski

        parameters:
          - in: query
            name: candid
            description: "ZTF alert candid"
            required: true
            schema:
              type: integer
          - in: query
            name: cutout
            description: "retrieve science, template, or difference cutout image?"
            required: true
            schema:
              type: string
              enum: [science, template, difference]
          - in: query
            name: file_format
            description: "response file format: original loss-less FITS or rendered png"
            required: true
            default: png
            schema:
              type: string
              enum: [fits, png]
          - in: query
            name: interval
            description: "Interval to use when rendering png"
            required: false
            schema:
              type: string
              enum: [min_max, zscale]
          - in: query
            name: stretch
            description: "Stretch to use when rendering png"
            required: false
            schema:
              type: string
              enum: [linear, log, asinh, sqrt]
          - in: query
            name: cmap
            description: "Color map to use when rendering png"
            required: false
            schema:
              type: string
              enum: [bone, gray, cividis, viridis, magma]

        responses:
          '200':
            description: retrieved cutout
            content:
              image/fits:
                schema:
                  type: string
                  format: binary
              image/png:
                schema:
                  type: string
                  format: binary

          '400':
            description: retrieval failed
            content:
              application/json:
                schema: Error
        """
        # allow access to public data only by default
        selector = {1}
        with self.Session():
            for stream in self.associated_user_object.streams:
                if "ztf" in stream.name.lower():
                    selector.update(set(stream.altdata.get("selector", [])))

        selector = list(selector)

        try:
            candid = int(self.get_argument("candid"))
            cutout = self.get_argument("cutout").capitalize()
            file_format = self.get_argument("file_format", "png").lower()
            interval = self.get_argument("interval", default=None)
            stretch = self.get_argument("stretch", default=None)
            cmap = self.get_argument("cmap", default=None)

            known_cutouts = ["Science", "Template", "Difference"]
            if cutout not in known_cutouts:
                return self.error(
                    f"Cutout {cutout} of {object_id}/{candid} not in {str(known_cutouts)}"
                )
            known_file_formats = ["fits", "png"]
            if file_format not in known_file_formats:
                return self.error(
                    f"File format {file_format} of {object_id}/{candid}/{cutout} not in {str(known_file_formats)}"
                )

            normalization_methods = {
                "asymmetric_percentile": AsymmetricPercentileInterval(
                    lower_percentile=1, upper_percentile=100
                ),
                "min_max": MinMaxInterval(),
                "zscale": ZScaleInterval(nsamples=600, contrast=0.045, krej=2.5),
            }
            if interval is None:
                interval = "asymmetric_percentile"
            normalizer = normalization_methods.get(
                interval.lower(),
                AsymmetricPercentileInterval(lower_percentile=1, upper_percentile=100),
            )

            stretching_methods = {
                "linear": LinearStretch,
                "log": LogStretch,
                "asinh": AsinhStretch,
                "sqrt": SqrtStretch,
            }
            if stretch is None:
                stretch = "log" if cutout != "Difference" else "linear"
            stretcher = stretching_methods.get(stretch.lower(), LogStretch)()

            if (cmap is None) or (
                cmap.lower() not in ["bone", "gray", "cividis", "viridis", "magma"]
            ):
                cmap = "bone"
            else:
                cmap = cmap.lower()

            query = {
                "query_type": "find",
                "query": {
                    "catalog": "ZTF_alerts",
                    "filter": {
                        "candid": candid,
                        "candidate.programid": {"$in": selector},
                    },
                    "projection": {"_id": 0, f"cutout{cutout}": 1},
                },
                "kwargs": {"limit": 1, "max_time_ms": 5000},
            }

            response = kowalski.query(query=query)

            if response.get("default").get("status", "error") == "success":
                alert = response.get("default").get("data", [dict()])[0]
            else:
                return self.error("No cutout found.")

            cutout_data = bj.loads(bj.dumps([alert[f"cutout{cutout}"]["stampData"]]))[0]

            # unzipped fits name
            fits_name = pathlib.Path(alert[f"cutout{cutout}"]["fileName"]).with_suffix(
                ""
            )

            # unzip and flip about y axis on the server side
            with gzip.open(io.BytesIO(cutout_data), "rb") as f:
                with fits.open(io.BytesIO(f.read()), ignore_missing_simple=True) as hdu:
                    header = hdu[0].header
                    data_flipped_y = np.flipud(hdu[0].data)

            if file_format == "fits":
                hdu = fits.PrimaryHDU(data_flipped_y, header=header)
                hdul = fits.HDUList([hdu])

                stamp_fits = io.BytesIO()
                hdul.writeto(fileobj=stamp_fits)

                self.set_header("Content-Type", "image/fits")
                self.set_header(
                    "Content-Disposition", f"Attachment;filename={fits_name}"
                )
                self.write(stamp_fits.getvalue())

            if file_format == "png":
                buff = io.BytesIO()

                fig, ax = plt.subplots(figsize=(4, 4))
                fig.subplots_adjust(0, 0, 1, 1)
                ax.set_axis_off()

                # replace nans with median:
                img = np.array(data_flipped_y)
                # replace dubiously large values
                xl = np.greater(np.abs(img), 1e20, where=~np.isnan(img))
                if img[xl].any():
                    img[xl] = np.nan
                if np.isnan(img).any():
                    median = float(np.nanmean(img.flatten()))
                    img = np.nan_to_num(img, nan=median)
                norm = ImageNormalize(img, stretch=stretcher)
                img_norm = norm(img)
                vmin, vmax = normalizer.get_limits(img_norm)
                ax.imshow(img_norm, cmap=cmap, origin="lower", vmin=vmin, vmax=vmax)
                plt.savefig(buff, dpi=42, format="png")
                plt.close(fig)
                buff.seek(0)
                self.set_header("Content-Type", "image/png")
                self.write(buff.getvalue())

        except Exception:
            _err = traceback.format_exc()
            return self.error(f"failure: {_err}")


class AlertTripletsHandler(BaseHandler):
    @auth_or_token
    async def get(self, object_id: str = None):
        """
        ---
        summary: Serve alert cutouts as a triplet
        tags:
          - alerts
          - kowalski

        parameters:
          - in: query
            name: candid
            description: "ZTF alert candid"
            required: true
            schema:
              type: integer
          - in: query
            name: normalizeImage
            required: false
            schema:
              type: boolean
            default: false
        responses:
          '200':
            description: retrieved aux data
            content:
              application/json:
                schema:
                  allOf:
                    - $ref: '#/components/schemas/Success'
                    - type: object
                      properties:
                        data:
                          type: object
          '400':
            description: retrieval failed
            content:
              application/json:
                schema: Error
        """
        # allow access to public data only by default
        selector = {1}
        with self.Session():
            for stream in self.associated_user_object.streams:
                if "ztf" in stream.name.lower():
                    selector.update(set(stream.altdata.get("selector", [])))

        selector = list(selector)

        candid = self.get_query_argument("candid", None)
        if candid:
            try:
                candid = int(candid)
            except Exception as e:
                return self.error(f"Candidate ID must be integer: {str(e)}")

        normalize_image = self.get_query_argument("normalizeImage", False) in [
            "True",
            "t",
            "true",
            "1",
            True,
            1,
        ]

        try:
            if candid:
                filt = {"candid": candid, "candidate.programid": {"$in": selector}}
            else:
                filt = {"objectId": object_id, "candidate.programid": {"$in": selector}}

            query = {
                "query_type": "find",
                "query": {
                    "catalog": "ZTF_alerts",
                    "filter": filt,
                    "projection": {
                        "_id": 0,
                        "cutoutScience": 1,
                        "cutoutTemplate": 1,
                        "cutoutDifference": 1,
                        "candidate.candid": 1,
                    },
                },
                "kwargs": {"limit": 1, "max_time_ms": 5000},
            }

            response = kowalski.query(query=query)

            if response.get("default").get("status", "error") == "success":
                alerts = response.get("default").get("data", [dict()])
            else:
                return self.error("No cutout found.")

            return_data = []
            for alert in alerts:

                candid = alert["candidate"]
                cutout_dict = dict()
                image_corrupt = False

                for cutout in ("science", "template", "difference"):
                    cutout_data = bj.loads(
                        bj.dumps([alert[f"cutout{cutout.capitalize()}"]["stampData"]])
                    )[0]

                    with gzip.open(io.BytesIO(cutout_data), "rb") as f:
                        with fits.open(io.BytesIO(f.read())) as hdu:
                            data = hdu[0].data
                            medfill = np.nanmedian(data.flatten())
                            if (
                                medfill == np.nan
                                or medfill == -np.inf
                                or medfill == np.inf
                            ):
                                image_corrupt = True

                            cutout_dict[cutout] = np.nan_to_num(data, nan=medfill)
                            # normalize
                            if normalize_image and not image_corrupt:
                                cutout_dict[cutout] /= np.linalg.norm(
                                    cutout_dict[cutout]
                                )

                            if np.all(cutout_dict[cutout].flatten() == 0):
                                image_corrupt = True

                    # pad to 63x63 if smaller
                    shape = cutout_dict[cutout].shape
                    if shape != (63, 63):
                        medfill = np.nanmedian(cutout_dict[cutout].flatten())
                        cutout_dict[cutout] = np.pad(
                            cutout_dict[cutout],
                            [(0, 63 - shape[0]), (0, 63 - shape[1])],
                            mode="constant",
                            constant_values=medfill,
                        )
                triplet = np.zeros((63, 63, 3))
                triplet[:, :, 0] = cutout_dict["science"]
                triplet[:, :, 1] = cutout_dict["template"]
                triplet[:, :, 2] = cutout_dict["difference"]

                return_data.append(
                    {
                        "candid": candid,
                        "triplet": triplet,
                        "image_corrupt": image_corrupt,
                    }
                )

            return self.success(data=return_data)
        except Exception:
            _err = traceback.format_exc()
            return self.error(f"failure: {_err}")
