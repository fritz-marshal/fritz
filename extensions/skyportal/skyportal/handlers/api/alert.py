from astropy.io import fits
import bson.json_util as bj
import gzip
import io
from marshmallow.exceptions import ValidationError
import matplotlib.colors as mplc
import matplotlib.pyplot as plt
import numpy as np
import os
import pandas as pd
import pathlib
import requests
import traceback

from baselayer.app.access import auth_or_token
from baselayer.log import make_log
from ..base import BaseHandler
from ...models import (
    DBSession,
    Group,
    Obj,
    Stream,
    StreamUser,
    Source,
)
from .photometry import PhotometryHandler
from .source import SourceHandler


log = make_log("alert")


s = requests.Session()


class ZTFAlertHandler(BaseHandler):
    def get_user_streams(self):

        streams = (
            DBSession()
            .query(Stream)
            .join(StreamUser)
            .filter(StreamUser.user_id == self.associated_user_object.id)
            .all()
        )
        if streams is None:
            streams = []

        return streams

    def query_kowalski(self, query, timeout=7):
        base_url = f"{self.cfg['app.kowalski.protocol']}://" \
                   f"{self.cfg['app.kowalski.host']}:{self.cfg['app.kowalski.port']}"
        headers = {"Authorization": f"Bearer {self.cfg['app.kowalski.token']}"}

        resp = s.post(
            os.path.join(base_url, 'api/queries'),
            json=query,
            headers=headers,
            timeout=timeout
        )

        return resp

    @auth_or_token
    def get(self, objectId: str = None):
        """
        ---
        single:
          description: Retrieve a ZTF objectId from Kowalski
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
        streams = self.get_user_streams()

        # allow access to public data only by default
        selector = {1}

        for stream in streams:
            if "ztf" in stream.name.lower():
                selector.update(set(stream.altdata.get("selector", [])))

        selector = list(selector)

        try:
            query = {
                "query_type": "aggregate",
                "query": {
                    "catalog": "ZTF_alerts",
                    "pipeline": [
                        {
                            "$match": {
                                "objectId": objectId,
                                "candidate.programid": {"$in": selector}
                            }
                        },
                        {
                            "$project": {
                                # grab only what's going to be rendered
                                "_id": 0,
                                "candid": {"$toString": "$candid"},  # js luvz bigints
                                "candidate.jd": 1,
                                "candidate.programid": 1,
                                "candidate.fid": 1,
                                "candidate.ra": 1,
                                "candidate.dec": 1,
                                "candidate.magpsf": 1,
                                "candidate.sigmapsf": 1,
                                "candidate.rb": 1,
                                "candidate.drb": 1,
                                "candidate.isdiffpos": 1,
                                "coordinates.l": 1,
                                "coordinates.b": 1,
                            }
                        },
                    ]
                },
                # "kwargs": {
                #     "max_time_ms": 10000
                # }
            }

            candid = self.get_query_argument('candid', None)
            if candid:
                query["query"]["pipeline"][0]["$match"]["candid"] = int(candid)

            resp = self.query_kowalski(query=query)

            if resp.status_code == requests.codes.ok:
                alert_data = bj.loads(resp.text).get('data')
                return self.success(data=alert_data)
            else:
                return self.error(f"Failed to fetch data for {objectId} from Kowalski")

        except Exception:
            _err = traceback.format_exc()
            return self.error(f'failure: {_err}')

    @auth_or_token
    def post(self, objectId):
        """
        ---
        description: Save ZTF objectId from Kowalski as source in SkyPortal
        requestBody:
          content:
            application/json:
              schema:
                allOf:
                  - type: object
                    properties:
                      candid:
                        type: integer
                        description: "[fritz] science program filter id for this user group id"
                        minimum: 1
                      group_ids:
                        type: array
                        items:
                          type: integer
                        description: "group ids to save source to"
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
        streams = self.get_user_streams()

        # allow access to public data only by default
        selector = {1}

        for stream in streams:
            if "ztf" in stream.name.lower():
                selector.update(set(stream.altdata.get("selector", [])))

        selector = list(selector)

        data = self.get_json()
        candid = data.get("candid", None)
        group_ids = data.pop("group_ids")

        try:
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
                                                selector
                                            ]
                                        }
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
                        }
                    ]
                }
            }

            resp = self.query_kowalski(query=query)

            if resp.status_code == requests.codes.ok:
                alert_data = bj.loads(resp.text).get('data', list(dict()))
                if len(alert_data) > 0:
                    alert_data = alert_data[0]
            else:
                return self.error(f"Failed to fetch data for {objectId} from Kowalski")

            # grab and append most recent candid as it should not be in prv_candidates
            query = {
                "query_type": "aggregate",
                "query": {
                    "catalog": "ZTF_alerts",
                    "pipeline": [
                        {
                            "$match": {
                                "objectId": objectId,
                                "candidate.programid": {"$in": selector}
                            }
                        },
                        {
                            "$project": {
                                # grab only what's going to be rendered
                                "_id": 0,
                                "candidate.candid": 1,
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
                        {
                            "$sort": {
                                "candidate.jd": -1
                            }
                        },
                        {
                            "$limit": 1
                        }
                    ]
                }
            }

            resp = self.query_kowalski(query=query)

            if resp.status_code == requests.codes.ok:
                latest_alert_data = bj.loads(resp.text).get('data', list(dict()))
                if len(latest_alert_data) > 0:
                    latest_alert_data = latest_alert_data[0]
            else:
                return self.error(f"Failed to fetch data for {objectId} from Kowalski")

            if len(latest_alert_data) > 0:
                candids = {a.get('candid', None) for a in alert_data['prv_candidates']}
                if latest_alert_data['candidate']["candid"] not in candids:
                    alert_data['prv_candidates'].append(latest_alert_data['candidate'])

            # return self.success(data=alert_data)

            df = pd.DataFrame.from_records(alert_data["prv_candidates"])
            w = df["candid"] == candid

            if candid is None or sum(w) == 0:
                candid = int(df["candid"].max())
                alert = df.loc[df["candid"] == candid].to_dict(orient="records")
            else:
                alert = df.loc[w].to_dict(orient="records")

            # post source
            obj = {
                "id": objectId,
                "ra": alert.get('ra'),
                "dec": alert.get('dec'),
                "score": alert.get('drb', alert['rb']),
                "altdata": {
                    "passing_alert_id": candid,
                },
                "group_ids": group_ids
            }

            source_handler = SourceHandler(request=self.request, application=self.application)
            try:
                source_handler.post(json=obj)
                print(self.get_status())
            except:
                log(f"Failed to post {objectId}")
            self.clear()

            user_group_ids = [g.id for g in self.associated_user_object.groups]
            user_accessible_group_ids = [g.id for g in self.associated_user_object.accessible_groups]
            if not user_group_ids:
                return self.error(
                    "You must belong to one or more groups before you can add sources."
                )
            try:
                group_ids = [
                    int(_id)
                    for _id in group_ids
                    if int(_id) in user_accessible_group_ids
                ]
            except KeyError:
                group_ids = user_group_ids
            if not group_ids:
                return self.error(
                    "Invalid group_ids field. Please specify at least "
                    "one valid group ID that you belong to."
                )

            groups = Group.query.filter(Group.id.in_(group_ids)).all()
            if not groups:
                return self.error(
                    "Invalid group_ids field. Please specify at least "
                    "one valid group ID that you belong to."
                )
            DBSession().add(obj)
            DBSession().add_all([Source(obj=obj, group=group) for group in groups])
            DBSession().commit()

            # todo
            photometry_handler = PhotometryHandler(request=self.request, application=self.application)
            try:
                photometry_handler.get(objectId)
                print(self.get_status())
            except:
                log(f"Failed to post photometry of {objectId}")
            self.clear()

            self.push_all(action="skyportal/FETCH_SOURCES")
            self.push_all(action="skyportal/FETCH_RECENT_SOURCES")
            return self.success(data={"id": obj["id"]})

        except Exception:
            _err = traceback.format_exc()
            return self.error(f'failure: {_err}')


class ZTFAlertAuxHandler(ZTFAlertHandler):
    @auth_or_token
    def get(self, objectId: str = None):
        """
        ---
        single:
          description: Retrieve aux data for an objectId from Kowalski
          parameters:
            - in: path
              name: objectId
              required: false
              schema:
                type: string
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
        streams = self.get_user_streams()

        # allow access to public data only by default
        selector = {1}

        for stream in streams:
            if "ztf" in stream.name.lower():
                selector.update(set(stream.altdata.get("selector", [])))

        selector = list(selector)

        try:
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
                                                selector
                                            ]
                                        }
                                    }
                                },
                            }
                        },
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
                    ]
                }
            }

            resp = self.query_kowalski(query=query)

            if resp.status_code == requests.codes.ok:
                alert_data = bj.loads(resp.text).get('data', list(dict()))
                if len(alert_data) > 0:
                    alert_data = alert_data[0]
            else:
                return self.error(f"Failed to fetch data for {objectId} from Kowalski")

            # grab and append most recent candid as it should not be in prv_candidates
            query = {
                "query_type": "aggregate",
                "query": {
                    "catalog": "ZTF_alerts",
                    "pipeline": [
                        {
                            "$match": {
                                "objectId": objectId,
                                "candidate.programid": {"$in": selector}
                            }
                        },
                        {
                            "$project": {
                                # grab only what's going to be rendered
                                "_id": 0,
                                "candidate.candid": 1,
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
                        },
                        {
                            "$sort": {
                                "candidate.jd": -1
                            }
                        },
                        {
                            "$limit": 1
                        }
                    ]
                }
            }

            resp = self.query_kowalski(query=query)

            if resp.status_code == requests.codes.ok:
                latest_alert_data = bj.loads(resp.text).get('data', list(dict()))
                if len(latest_alert_data) > 0:
                    latest_alert_data = latest_alert_data[0]
            else:
                return self.error(f"Failed to fetch data for {objectId} from Kowalski")

            if len(latest_alert_data) > 0:
                candids = {a.get('candid', None) for a in alert_data['prv_candidates']}
                if latest_alert_data['candidate']["candid"] not in candids:
                    alert_data['prv_candidates'].append(latest_alert_data['candidate'])

            return self.success(data=alert_data)

        except Exception:
            _err = traceback.format_exc()
            return self.error(f'failure: {_err}')


class ZTFAlertCutoutHandler(ZTFAlertHandler):
    @auth_or_token
    def get(self, objectId: str = None):
        """
        ---
        summary: Serve ZTF alert cutout as fits or png
        tags:
          - lab

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
            schema:
              type: string
              enum: [fits, png]

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
        streams = self.get_user_streams()

        # allow access to public data only by default
        selector = {1}

        for stream in streams:
            if "ztf" in stream.name.lower():
                selector.update(set(stream.altdata.get("selector", [])))

        selector = list(selector)

        try:
            candid = int(self.get_argument('candid'))
            cutout = self.get_argument('cutout').capitalize()
            file_format = self.get_argument('file_format')

            known_cutouts = ['Science', 'Template', 'Difference']
            if cutout not in known_cutouts:
                return self.error(f'cutout {cutout} of {objectId}/{candid} not in {str(known_cutouts)}')
            known_file_formats = ['fits', 'png']
            if file_format not in known_file_formats:
                return self.error(
                    f'file format {file_format} of {objectId}/{candid}/{cutout} not in {str(known_file_formats)}'
                )

            query = {
                "query_type": "find",
                "query": {
                    "catalog": "ZTF_alerts",
                    "filter": {
                        "candid": candid,
                        "candidate.programid": {
                            "$in": selector
                        }
                    },
                    "projection": {
                        "_id": 0,
                        f"cutout{cutout}": 1
                    }
                },
                "kwargs": {
                    "limit": 1,
                    "max_time_ms": 5000
                }
            }

            resp = self.query_kowalski(query=query)

            if resp.status_code == requests.codes.ok:
                alert = bj.loads(resp.text).get('data', list(dict()))[0]
            else:
                alert = dict()

            cutout_data = bj.loads(bj.dumps([alert[f'cutout{cutout}']['stampData']]))[0]

            # unzipped fits name
            fits_name = pathlib.Path(alert[f"cutout{cutout}"]["fileName"]).with_suffix('')

            # unzip and flip about y axis on the server side
            with gzip.open(io.BytesIO(cutout_data), 'rb') as f:
                with fits.open(io.BytesIO(f.read())) as hdu:
                    header = hdu[0].header
                    data_flipped_y = np.flipud(hdu[0].data)

            if file_format == 'fits':
                hdu = fits.PrimaryHDU(data_flipped_y, header=header)
                hdul = fits.HDUList([hdu])

                stamp_fits = io.BytesIO()
                hdul.writeto(fileobj=stamp_fits)

                self.set_header("Content-Type", 'image/fits')
                self.set_header("Content-Disposition", f'Attachment;filename={fits_name}')
                self.write(stamp_fits.getvalue())

            if file_format == 'png':
                buff = io.BytesIO()
                plt.close('all')

                fig, ax = plt.subplots(figsize=(4, 4))
                fig.subplots_adjust(0, 0, 1, 1)
                ax.set_axis_off()

                # remove nans:
                img = np.array(data_flipped_y)
                img = np.nan_to_num(img)

                if cutout != 'Difference':
                    img[img <= 0] = np.median(img)
                    ax.imshow(img, cmap='bone', norm=mplc.LogNorm(), origin='lower')
                else:
                    ax.imshow(img, cmap='bone', origin='lower')
                plt.savefig(buff, dpi=42)

                buff.seek(0)
                plt.close('all')
                self.set_header("Content-Type", 'image/png')
                self.write(buff.getvalue())

        except Exception:
            _err = traceback.format_exc()
            return self.error(f'failure: {_err}')
