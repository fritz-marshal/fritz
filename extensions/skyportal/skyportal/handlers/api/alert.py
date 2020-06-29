from astropy.io import fits
from bson.json_util import loads, dumps
import gzip
import io
from matplotlib.colors import LogNorm
import matplotlib.pyplot as plt
from numpy import array, flipud, median, nan_to_num
import os
import pathlib
import requests
import traceback

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


class AlertCutoutHandler(BaseHandler):
    @auth_or_token
    # @routes.get('/lab/ztf-alerts/{candid}/cutout/{cutout}/{file_format}', allow_head=False)
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
                            "$in": [1, 2, 3]  # fixme: ACLs
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

            base_url = f"{self.cfg['app.kowalski.protocol']}://" \
                       f"{self.cfg['app.kowalski.host']}:{self.cfg['app.kowalski.port']}"
            headers = {"Authorization": f"Bearer {self.cfg['app.kowalski.token']}"}

            resp = s.post(
                os.path.join(base_url, 'api/queries'),
                json=query, headers=headers
            )

            if resp.status_code == requests.codes.ok:
                alert = loads(resp.text).get('data', list(dict()))[0]
            else:
                alert = dict()

            cutout_data = loads(dumps([alert[f'cutout{cutout}']['stampData']]))[0]

            # unzipped fits name
            fits_name = pathlib.Path(alert[f"cutout{cutout}"]["fileName"]).with_suffix('')

            # unzip and flip about y axis on the server side
            with gzip.open(io.BytesIO(cutout_data), 'rb') as f:
                with fits.open(io.BytesIO(f.read())) as hdu:
                    header = hdu[0].header
                    data_flipped_y = flipud(hdu[0].data)

            if file_format == 'fits':
                hdu = fits.PrimaryHDU(data_flipped_y, header=header)
                # hdu = fits.PrimaryHDU(data_flipped_y)
                hdul = fits.HDUList([hdu])

                stamp_fits = io.BytesIO()
                hdul.writeto(fileobj=stamp_fits)

                self.set_header("Content-Type", 'image/fits')
                self.set_header("Content-Disposition", f'Attachment;filename={fits_name}')
                self.write(stamp_fits.getvalue())

            if file_format == 'png':
                buff = io.BytesIO()
                plt.close('all')
                fig = plt.figure()
                fig.set_size_inches(4, 4, forward=False)
                ax = plt.Axes(fig, [0., 0., 1., 1.])
                ax.set_axis_off()
                fig.add_axes(ax)

                # remove nans:
                img = array(data_flipped_y)
                img = nan_to_num(img)

                if cutout != 'Difference':
                    # img += np.min(img)
                    img[img <= 0] = median(img)
                    # plt.imshow(img, cmap='gray', norm=LogNorm(), origin='lower')
                    plt.imshow(img, cmap=plt.cm.bone, norm=LogNorm(), origin='lower')
                else:
                    # plt.imshow(img, cmap='gray', origin='lower')
                    plt.imshow(img, cmap=plt.cm.bone, origin='lower')
                plt.savefig(buff, dpi=42)

                buff.seek(0)
                plt.close('all')
                self.set_header("Content-Type", 'image/png')
                self.write(buff.getvalue())

        except Exception as _e:
            _err = traceback.format_exc()
            return self.error(f'failure: {_err}')
