from bson.json_util import loads
import os
import requests

from baselayer.app.access import auth_or_token, permissions
from ..base import BaseHandler


# from ...models import (
#     DBSession,
#     Filter,
# )


s = requests.Session()


class AlertHandler(BaseHandler):
    @auth_or_token
    def get(self, candid: int = None, objectId: str = None):
        """
        ---
        single:
          description: Retrieve a filter
          parameters:
            - in: path
              name: candid
              required: true
              schema:
                type: integer
          responses:
            200:
              content:
                application/json:
                  schema: SingleFilter
            400:
              content:
                application/json:
                  schema: Error
        multiple:
          description: Retrieve all filters
          responses:
            200:
              content:
                application/json:
                  schema: ArrayOfFilters
            400:
              content:
                application/json:
                  schema: Error
        """
        # alert = self.cfg['app.kowalski']

        print(candid, objectId)

        query = {
            "query_type": "aggregate",
            "query": {
                "catalog": "ZTF_alerts",
                "pipeline": [
                    {
                        "$match": {
                            "candid": int(candid),
                            # todo: "candidate.program": {"$in": [1, ]}
                        }
                    },
                    {
                        "$project": {
                            "cutoutScience": 0,
                            "cutoutTemplate": 0,
                            "cutoutDifference": 0
                        }
                    },
                    {
                        "$lookup": {
                            "from": "ZTF_alerts_aux",
                            "localField": "objectId",
                            "foreignField": "_id",
                            "as": "aux"
                        }
                    },
                    {
                        "$project": {
                            "cross_matches": {
                                "$arrayElemAt": [
                                    "$aux.cross_matches",
                                    0
                                ]
                            },
                            "prv_candidates": {
                                "$filter": {
                                    "input": {
                                        "$arrayElemAt": [
                                            "$aux.prv_candidates",
                                            0
                                        ]
                                    },
                                    "as": "item",
                                    "cond": {
                                        "$in": [
                                            "$$item.programid",
                                            [
                                                1
                                            ]
                                        ]
                                    }
                                }
                            },
                            "schemavsn": 1,
                            "publisher": 1,
                            "objectId": 1,
                            "candid": 1,
                            "candidate": 1,
                            "classifications": 1,
                            "coordinates": 1,
                            "_id": 0,
                        }
                    },
                ]
            },
            "kwargs": {
                "max_time_ms": 1000
            }
        }

        base_url = f"{self.cfg['app.kowalski.protocol']}://" \
                   f"{self.cfg['app.kowalski.host']}:{self.cfg['app.kowalski.port']}"
        headers = {"Authorization": f"Bearer {self.cfg['app.kowalski.token']}"}

        resp = s.post(
            os.path.join(base_url, 'api/queries'),
            json=query, headers=headers
        )

        if resp.status_code == requests.codes.ok:
            alert = loads(resp.text)
        else:
            alert = dict()

        return self.success(data=alert)
