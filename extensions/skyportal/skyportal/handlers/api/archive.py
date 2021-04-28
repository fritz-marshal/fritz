import numpy as np
import pandas as pd
from penquins import Kowalski
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from typing import Mapping, Optional
import uuid

from baselayer.log import make_log
from baselayer.app.access import auth_or_token, permissions
from baselayer.app.env import load_env
from ..base import BaseHandler
from skyportal.model_util import create_token, delete_token


env, cfg = load_env()
log = make_log("archive")


gloria = Kowalski(
    token=cfg["app.gloria.token"],
    protocol=cfg["app.gloria.protocol"],
    host=cfg["app.gloria.host"],
    port=int(cfg["app.gloria.port"]),
    timeout=10,
)
log(f"Gloria connection OK: {gloria.ping()}")


def radec_to_iau_name(ra: float, dec: float, prefix: str = "ZTFJ"):
    """Transform R.A./Decl. in degrees to IAU-style hexadecimal designations."""
    if not 0.0 <= ra < 360.0:
        raise ValueError("Bad RA value in degrees")
    if not -90.0 <= dec <= 90.0:
        raise ValueError("Bad Dec value in degrees")

    ra_h = np.floor(ra * 12.0 / 180.0)
    ra_m = np.floor((ra * 12.0 / 180.0 - ra_h) * 60.0)
    ra_s = ((ra * 12.0 / 180.0 - ra_h) * 60.0 - ra_m) * 60.0

    dec_d = np.floor(abs(dec)) * np.sign(dec)
    dec_m = np.floor(np.abs(dec - dec_d) * 60.0)
    dec_s = np.abs(np.abs(dec - dec_d) * 60.0 - dec_m) * 60.0

    hms = f"{ra_h:02.0f}{ra_m:02.0f}{ra_s:05.2f}"
    dms = f"{dec_d:+03.0f}{dec_m:02.0f}{dec_s:04.1f}"

    return prefix + hms + dms


DEFAULT_TIMEOUT = 5  # seconds


class TimeoutHTTPAdapter(HTTPAdapter):
    def __init__(self, *args, **kwargs):
        self.timeout = DEFAULT_TIMEOUT
        if "timeout" in kwargs:
            self.timeout = kwargs["timeout"]
            del kwargs["timeout"]
        super().__init__(*args, **kwargs)

    def send(self, request, **kwargs):
        try:
            timeout = kwargs.get("timeout")
            if timeout is None:
                kwargs["timeout"] = self.timeout
            return super().send(request, **kwargs)
        except AttributeError:
            kwargs["timeout"] = DEFAULT_TIMEOUT


session = requests.Session()

retries = Retry(
    total=5,
    backoff_factor=2,
    status_forcelist=[405, 429, 500, 502, 503, 504],
    method_whitelist=["HEAD", "GET", "PUT", "POST", "PATCH"],
)
adapter = TimeoutHTTPAdapter(timeout=5, max_retries=retries)
session.mount("http://", adapter)


def api_skyportal(
    method: str,
    endpoint: str,
    token: str,
    data: Optional[Mapping] = None,
):
    """Make API call to SkyPortal instance

    :param method:
    :param endpoint:
    :param token:
    :param data:
    :return:
    """
    method = method.lower()
    methods = {
        "head": session.head,
        "get": session.get,
        "post": session.post,
        "put": session.put,
        "patch": session.patch,
        "delete": session.delete,
    }

    if endpoint is None:
        raise ValueError("Endpoint not specified")
    if method not in ["head", "get", "post", "put", "patch", "delete"]:
        raise ValueError(f"Unsupported method: {method}")

    session_headers = {
        "Authorization": f"token {token}",
        "User-Agent": "fritz:archive",
    }

    if method == "get":
        response = methods[method](
            f"http://{cfg['server.host']}:{cfg['server.port']}" f"{endpoint}",
            params=data,
            headers=session_headers,
        )
    else:
        response = methods[method](
            f"http://{cfg['server.host']}:{cfg['server.port']}" f"{endpoint}",
            json=data,
            headers=session_headers,
        )

    return response


def make_photometry(light_curves: list, drop_flagged: bool = False):
    """
    Make a pandas.DataFrame with photometry

    :param light_curves: list of photometric time series
    :param drop_flagged: drop data points with catflags!=0
    :return:
    """
    dfs = []
    for light_curve in light_curves:
        if len(light_curve["data"]):
            df = pd.DataFrame.from_records(light_curve["data"])
            df["fid"] = light_curve["filter"]
            dfs.append(df)

    df_light_curve = pd.concat(dfs, ignore_index=True, sort=False)

    ztf_filters = {1: "ztfg", 2: "ztfr", 3: "ztfi"}
    df_light_curve["ztf_filter"] = df_light_curve["fid"].apply(lambda x: ztf_filters[x])
    df_light_curve["magsys"] = "ab"
    df_light_curve["zp"] = 23.9
    df_light_curve["mjd"] = df_light_curve["hjd"] - 2400000.5

    df_light_curve["mjd"] = df_light_curve["mjd"].apply(lambda x: np.float64(x))
    df_light_curve["mag"] = df_light_curve["mag"].apply(lambda x: np.float32(x))
    df_light_curve["magerr"] = df_light_curve["magerr"].apply(lambda x: np.float32(x))

    # filter out flagged data:
    if drop_flagged:
        mask_not_flagged = df_light_curve["catflags"] == 0
        df_light_curve = df_light_curve.loc[mask_not_flagged]

    return df_light_curve


class ArchiveCatalogsHandler(BaseHandler):
    @auth_or_token
    def get(self):
        query = {"query_type": "info", "query": {"command": "catalog_names"}}
        catalog_names = gloria.query(query=query).get("data")
        return self.success(data=catalog_names)


class ArchiveHandler(BaseHandler):
    @auth_or_token
    def get(self):
        query = {"query_type": "info", "query": {"command": "catalog_names"}}
        # expose only the ZTF light curves for now
        available_catalogs = [
            catalog
            for catalog in gloria.query(query=query).get("data")
            if "ZTF_sources" in catalog
        ]

        # allow access to public data only by default
        program_id_selector = {1}

        for stream in self.associated_user_object.streams:
            if "ztf" in stream.name.lower():
                program_id_selector.update(set(stream.altdata.get("selector", [])))

        program_id_selector = list(program_id_selector)

        catalog = self.get_query_argument("catalog")
        if catalog not in available_catalogs:
            raise ValueError(f"Catalog {catalog} not available")

        # executing a cone search
        ra = self.get_query_argument("ra", None)
        dec = self.get_query_argument("dec", None)
        radius = self.get_query_argument("radius", None)
        radius_units = self.get_query_argument("radius_units", None)

        position_tuple = (ra, dec, radius, radius_units)

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
            # complete positional arguments? run "near" query
            if radius_units not in ["deg", "arcmin", "arcsec"]:
                return self.error(
                    "Invalid radius_units value. Must be one of either "
                    "'deg', 'arcmin', or 'arcsec'."
                )
            try:
                ra = float(ra)
                dec = float(dec)
                radius = float(radius)
            except ValueError:
                return self.error("Invalid (non-float) value provided.")
            if (
                (radius_units == "deg" and radius > 1)
                or (radius_units == "arcmin" and radius > 60)
                or (radius_units == "arcsec" and radius > 3600)
            ):
                return self.error("Radius must be <= 1.0 deg")

            # grab id's first
            query = {
                "query_type": "near",
                "query": {
                    "max_distance": radius,
                    "distance_units": radius_units,
                    "radec": {"query_coords": [ra, dec]},
                    "catalogs": {
                        catalog: {
                            "filter": {},
                            "projection": {"_id": 1},
                        }
                    },
                },
                "kwargs": {
                    "max_time_ms": 10000,
                    "limit": 1000,
                },
            }

            response = gloria.query(query=query)
            if response.get("status", "error") == "success":
                light_curve_ids = [
                    item["_id"]
                    for item in response.get("data")[catalog]["query_coords"]
                ]
                if len(light_curve_ids) == 0:
                    return self.success(data=[])

                query = {
                    "query_type": "aggregate",
                    "query": {
                        "catalog": catalog,
                        "pipeline": [
                            {"$match": {"_id": {"$in": light_curve_ids}}},
                            {
                                "$project": {
                                    "_id": 1,
                                    "ra": 1,
                                    "dec": 1,
                                    "filter": 1,
                                    "meanmag": 1,
                                    "vonneumannratio": 1,
                                    "refchi": 1,
                                    "refmag": 1,
                                    "refmagerr": 1,
                                    "iqr": 1,
                                    "data": {
                                        "$filter": {
                                            "input": "$data",
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
                        ],
                    },
                }
                response = gloria.query(query=query)
                if response.get("status", "error") == "success":
                    light_curves = response.get("data")
                    return self.success(data=light_curves)

            return self.error(response.get("message"))

    @permissions(["Upload data"])
    def post(self):
        """
        ---
        description: Post ZTF light curve data from a Kowalski instance to SkyPortal
        tags:
          - archive
          - kowalski
        requestBody:
          content:
            application/json:
              schema:
                allOf:
                  - type: object
                    properties:
                      obj_id:
                        type: str
                        description: "target obj_id to save photometry to. create new if None."
                      catalog:
                        type: str
                        description: "Kowalski catalog name to pull light curves from."
                        required: true
                      light_curve_ids:
                        type: array
                        items:
                          type: integer
                        description: "Light curves IDs in catalog on Kowalski."
                        required: true
                        minItems: 1
                      group_ids:
                        type: array
                        items:
                          type: integer
                        description: "group ids to save source to. defaults to all user groups"
                        required: false
                        minItems: 1
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
        print(data)  # fixme

        obj_id = data.pop("obj_id", None)
        catalog = data.pop("catalog", None)
        light_curve_ids = data.pop("light_curve_ids", None)
        group_ids = data.pop("group_ids", None)

        if obj_id is None and (group_ids is None or len(group_ids) == 0):
            return self.error("Parameter group_ids is required id obj_id not set")
        if catalog is None:
            return self.error("Missing required parameter: catalog")
        if light_curve_ids is None or len(light_curve_ids) == 0:
            return self.error("Bad required parameter: light_curve_ids")

        # allow access to public data only by default
        program_id_selector = {1}
        for stream in self.associated_user_object.streams:
            if "ztf" in stream.name.lower():
                program_id_selector.update(set(stream.altdata.get("selector", [])))
        program_id_selector = list(program_id_selector)

        # get data from Kowalski/Gloria
        query = {
            "query_type": "aggregate",
            "query": {
                "catalog": catalog,
                "pipeline": [
                    {"$match": {"_id": {"$in": light_curve_ids}}},
                    {
                        "$project": {
                            "_id": 1,
                            "ra": 1,
                            "dec": 1,
                            "filter": 1,
                            "meanmag": 1,
                            "vonneumannratio": 1,
                            "refchi": 1,
                            "refmag": 1,
                            "refmagerr": 1,
                            "iqr": 1,
                            "data": {
                                "$filter": {
                                    "input": "$data",
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
                ],
            },
        }
        response = gloria.query(query=query)
        if response.get("status", "error") == "error":
            return self.error(response.get("message"))

        light_curves = response.get("data")
        if len(light_curves) == 0:
            return self.error("No data found for requested light_curve_ids")

        # generate a temporary token
        token_name = str(uuid.uuid4())
        token_id = create_token(
            ACLs=["Upload data"],
            user_id=self.associated_user_object.id,
            name=token_name,
        )

        try:
            if obj_id is None:
                # generate position-based name if obj_id not set
                ra_mean = float(
                    np.mean(
                        [
                            light_curve["ra"]
                            for light_curve in light_curves
                            if light_curve.get("ra") is not None
                        ]
                    )
                )
                dec_mean = float(
                    np.mean(
                        [
                            light_curve["dec"]
                            for light_curve in light_curves
                            if light_curve.get("dec") is not None
                        ]
                    )
                )
                obj_id = radec_to_iau_name(ra_mean, dec_mean, prefix="ZTFJ")

                # create new source, reset obj_id
                response = api_skyportal("HEAD", f"/api/candidates/{obj_id}", token_id)
                is_candidate = response.status_code == 200
                response = api_skyportal("HEAD", f"/api/sources/{obj_id}", token_id)
                is_source = response.status_code == 200

                if is_candidate or is_source:
                    return self.error(f"Obj {obj_id} exists")

                post_source_data = {
                    "id": obj_id,
                    "ra": ra_mean,
                    "dec": dec_mean,
                    "group_ids": group_ids,
                    "origin": "Fritz",
                }

                response = api_skyportal(
                    "POST", "/api/sources", token_id, post_source_data
                )
                if response.json()["status"] == "error":
                    return self.error(f"Failed to save {obj_id} as a Source")

            # post photometry to obj_id; drop flagged data
            df_photometry = make_photometry(light_curves, drop_flagged=True)

            # get ZTF instrument id:
            instrument_id = 1
            response = api_skyportal(
                "GET", "/api/instrument", token_id, {"name": "ZTF"}
            )
            if (
                response.json()["status"] == "success"
                and len(response.json()["data"]) > 0
            ):
                instrument_id = response.json()["data"][0]["id"]

            photometry = {
                "obj_id": obj_id,
                "stream_ids": df_photometry["programid"].tolist(),
                # "group_ids": [1, 7, 8],
                "instrument_id": instrument_id,
                "mjd": df_photometry["mjd"].tolist(),
                "mag": df_photometry["mag"].tolist(),
                "magerr": df_photometry["magerr"].tolist(),
                "limiting_mag": df_photometry["zp"].tolist(),
                "magsys": df_photometry["magsys"].tolist(),
                "filter": df_photometry["ztf_filter"].tolist(),
                "ra": df_photometry["ra"].tolist(),
                "dec": df_photometry["dec"].tolist(),
            }

            if len(photometry.get("mag", ())) > 0:
                response = api_skyportal("PUT", "/api/photometry", token_id, photometry)
                if response.json()["status"] == "error":
                    return self.error(f"Failed to post {obj_id} photometry")

        finally:
            # always attempt deleting the temporary token
            delete_token(token_id)

        return self.success(data={"obj_id": obj_id})
