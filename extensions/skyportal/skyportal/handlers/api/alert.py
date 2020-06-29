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
    def get(self, objectId: str = None):
        """
        ---
        single:
          description: Retrieve an objectId from Kowalski
          parameters:
            - in: path
              name: objectId
              required: true
              schema:
                type: str
            - in: query
              name: candid
              required: false
              schema:
                type: int
          responses:
            200:
              description: retrieved alert(s)
              content:
                application/json:
                  schema:
                    type: object
                    required:
                      - status
                      - message
                    properties:
                      status:
                        type: string
                        enum: [success]
                      message:
                        type: string
            400:
              content:
                application/json:
                  schema: Error
        """
        # alert = self.cfg['app.kowalski']

        # /api/alerts/<objectId>

        print(objectId)

        # query = {
        #     "query_type": "find",
        #     "query": {
        #         "catalog": "ZTF_alerts",
        #         "filter": {
        #             "objectId": objectId
        #         },
        #         "projection": {
        #             "_id": 0,
        #             "candid": 1,
        #         }
        #     },
        #     "kwargs": {
        #         "limit": 1
        #     }
        # }

        query = {
            "query_type": "aggregate",
            "query": {
                "catalog": "ZTF_alerts",
                "pipeline": [
                    {
                        "$match": {
                            "objectId": objectId
                        }
                    },
                    {
                        "$project": {
                            # grab only what's going to be rendered
                            "_id": 0,
                            "candid": {"$toString": "$candid"},  # js luvz bigints
                            "candidate.jd": 1,
                            "candidate.fid": 1,
                            "candidate.magpsf": 1,
                            "candidate.sigmapsf": 1,
                            "candidate.rb": 1,
                            "candidate.drb": 1,
                            "candidate.isdiffpos": 1,
                        }
                    },
                    # {
                    #     "$limit": 1
                    # }
                ]
            }
        }

        # query = {
        #     "query_type": "aggregate",
        #     "query": {
        #         "catalog": "ZTF_alerts",
        #         "pipeline": [
        #             {
        #                 "$match": {
        #                     "candid": int(candid),
        #                     # todo: "candidate.program": {"$in": [1, ]}
        #                 }
        #             },
        #             {
        #                 "$project": {
        #                     "cutoutScience": 0,
        #                     "cutoutTemplate": 0,
        #                     "cutoutDifference": 0
        #                 }
        #             },
        #             {
        #                 "$lookup": {
        #                     "from": "ZTF_alerts_aux",
        #                     "localField": "objectId",
        #                     "foreignField": "_id",
        #                     "as": "aux"
        #                 }
        #             },
        #             {
        #                 "$project": {
        #                     "cross_matches": {
        #                         "$arrayElemAt": [
        #                             "$aux.cross_matches",
        #                             0
        #                         ]
        #                     },
        #                     "prv_candidates": {
        #                         "$filter": {
        #                             "input": {
        #                                 "$arrayElemAt": [
        #                                     "$aux.prv_candidates",
        #                                     0
        #                                 ]
        #                             },
        #                             "as": "item",
        #                             "cond": {
        #                                 "$in": [
        #                                     "$$item.programid",
        #                                     [
        #                                         1
        #                                     ]
        #                                 ]
        #                             }
        #                         }
        #                     },
        #                     "schemavsn": 1,
        #                     "publisher": 1,
        #                     "objectId": 1,
        #                     "candid": 1,
        #                     "candidate": 1,
        #                     "classifications": 1,
        #                     "coordinates": 1,
        #                     "_id": 0,
        #                 }
        #             },
        #         ]
        #     },
        #     "kwargs": {
        #         "max_time_ms": 1000
        #     }
        # }

        base_url = f"{self.cfg['app.kowalski.protocol']}://" \
                   f"{self.cfg['app.kowalski.host']}:{self.cfg['app.kowalski.port']}"
        headers = {"Authorization": f"Bearer {self.cfg['app.kowalski.token']}"}

        resp = s.post(
            os.path.join(base_url, 'api/queries'),
            json=query, headers=headers
        )

        if resp.status_code == requests.codes.ok:
            alert_data = loads(resp.text).get('data')
            # print(alert_data)
            # self.push_all(action="skyportal/FETCH_ALERT")
            return self.success(data=alert_data)
        else:
            alert_data = []
            return self.error(f"Failed to fetch data for {objectId} from Kowalski")


class AlertAuxHandler(BaseHandler):
    @auth_or_token
    def get(self, objectId: int = None):
        """
        ---
        single:
          description: Retrieve aux data for an objectId from Kowalski
          parameters:
            - in: path
              name: objectId
              required: false
              schema:
                type: int
          responses:
            200:
              description: retrieval failed
              content:
                application/json:
                  schema:
                    type: object
                    required:
                      - status
                      - message
                    properties:
                      status:
                        type: string
                        enum: [success]
                      message:
                        type: string
            400:
              content:
                application/json:
                  schema: Error
        """
        # alert = self.cfg['app.kowalski']

        # /api/alerts/<objectId>?candid=<candid>
        # - if no candid is specified, assemble lc, show table with detection history
        #   - actual alerts from ZTF_alerts have links that load in the thumbnails + alert contents on the right side
        #   - the latest candid is displayed on the right, lc plot shows a dashed vertical line for <jd>
        # - if candid is specified, display it on the right-hand side right away
        #   - on error (e.g., wrong candid) display the default, show error
        # - if objectId does not exist on K, display that info

        print(objectId, 'aux')

        query = {
            "query_type": "aggregate",
            "query": {
                "catalog": "ZTF_alerts_aux",
                "pipeline": [
                    {
                        "$match": {
                            "_id": objectId
                        }
                    },
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
                                            [
                                                1, 2, 3  # fixme: ACLs plug in here!
                                            ]
                                        ]
                                    }
                                }
                            },
                        }
                    }
                ]
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
            alert_data = loads(resp.text).get('data', list(dict()))[0]
        else:
            alert_data = dict()

        return self.success(data=alert_data)
