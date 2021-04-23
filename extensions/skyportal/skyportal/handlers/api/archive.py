from penquins import Kowalski

from baselayer.log import make_log
from baselayer.app.access import auth_or_token
from baselayer.app.env import load_env
from ..base import BaseHandler


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
