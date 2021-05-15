from penquins import Kowalski
from baselayer.app.access import auth_or_token
from baselayer.app.env import load_env
from ..base import BaseHandler
from ...models import Obj

env, cfg = load_env()

kowalski = Kowalski(
    token=cfg["app.kowalski.token"],
    protocol=cfg["app.kowalski.protocol"],
    host=cfg["app.kowalski.host"],
    port=int(cfg["app.kowalski.port"]),
    timeout=10,
)


class TNSInfoHandler(BaseHandler):
    @auth_or_token
    def get(self, obj_id):
        obj = Obj.get_if_accessible_by(obj_id, self.current_user, raise_if_none=True)
        query = {
            "query_type": "cone_search",
            "query": {
                "object_coordinates": {
                    "cone_search_radius": 2,
                    "cone_search_unit": "arcsec",
                    "radec": {obj_id: [obj.ra, obj.dec]},
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

        if response.get("status", None) != "success":
            return self.error("Error querying Kowalksi for TNS name.")
        tns_data = response.get("data").get("TNS").get(obj_id)
        return self.success(data={obj_id: tns_data})
