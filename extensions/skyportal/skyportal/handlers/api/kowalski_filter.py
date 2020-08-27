import bson.json_util as bj
from marshmallow.exceptions import ValidationError
import os
import requests

from baselayer.app.access import auth_or_token, permissions
from ..base import BaseHandler
from ...models import (
    DBSession,
    Filter,
    Stream
)


s = requests.Session()


class KowalskiFilterHandler(BaseHandler):
    @auth_or_token
    def get(self, filter_id):
        """
        fixme:
        ---
        single:
          description: Retrieve a filter as stored on Kowalski
          parameters:
            - in: path
              name: filter_id
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
        """
        acls = [acl.id for acl in self.current_user.acls]

        if filter_id is not None:
            if "System admin" in acls or "Manage groups" in acls:
                f = DBSession().query(Filter).get(filter_id)
            else:
                f = (
                    DBSession()
                    .query(Filter)
                    .filter(
                        Filter.id == filter_id,
                        Filter.group_id.in_(
                            [g.id for g in self.current_user.accessible_groups]
                        ),
                    )
                    .first()
                )
            if f is None:
                return self.error("Invalid filter ID.")

            group_id = f.group_id

            base_url = f"{self.cfg['app.kowalski.protocol']}://" \
                       f"{self.cfg['app.kowalski.host']}:{self.cfg['app.kowalski.port']}"
            headers = {"Authorization": f"Bearer {self.cfg['app.kowalski.token']}"}

            resp = s.get(
                os.path.join(base_url, f'api/filters/{group_id}/{filter_id}'),
                headers=headers,
                timeout=5
            )

            if resp.status_code == requests.codes.ok:
                data = bj.loads(resp.text).get('data')
                return self.success(data=data)
            else:
                return self.error(f"Failed to fetch data from Kowalski")

    @auth_or_token
    def post(self, filter_id):
        """
        fixme:
        ---
        description: POST a new filter version.
        requestBody:
          content:
            application/json:
              schema: FilterNoID
        responses:
          200:
            content:
              application/json:
                schema:
                  allOf:
                    - $ref: '#/components/schemas/Success'
                    - type: object
                      properties:
                        data:
                          type: object
                          properties:
                            id:
                              type: integer
                              description: New filter ID
        """
        data = self.get_json()
        pipeline = data.get('pipeline', None)
        if not pipeline:
            return self.error(
                "Missing pipeline parameter"
            )

        acls = [acl.id for acl in self.current_user.acls]

        if "System admin" in acls or "Manage groups" in acls:
            f = DBSession().query(Filter).get(filter_id)
        else:
            f = (
                DBSession()
                .query(Filter)
                .filter(
                    Filter.id == filter_id,
                    Filter.group_id.in_(
                        [g.id for g in self.current_user.accessible_groups]
                    ),
                )
                .first()
            )
        if f is None:
            return self.error("Invalid filter ID.")

        group_id = f.group_id

        # get stream:
        stream = (
            DBSession().query(Stream)
            .filter(Stream.id == f.stream_id)
            .first()
        )

        base_url = f"{self.cfg['app.kowalski.protocol']}://" \
                   f"{self.cfg['app.kowalski.host']}:{self.cfg['app.kowalski.port']}"
        headers = {"Authorization": f"Bearer {self.cfg['app.kowalski.token']}"}

        data = {
            "group_id": group_id,
            "filter_id": filter_id,
            "catalog": stream.altdata["collection"],
            "permissions": stream.altdata["selector"],
            "pipeline": pipeline
        }

        resp = s.post(
            os.path.join(base_url, f'api/filters'),
            headers=headers,
            json=data,
            timeout=5
        )

        if resp.status_code == requests.codes.ok:
            data = bj.loads(resp.text).get('data')
            return self.success(data=data)
        else:
            return self.error(f"Failed to post filter to Kowalski: {resp.text}")

    @auth_or_token
    def patch(self, filter_id):
        """
        fixme:
        ---
        description: Update a filter on K
        parameters:
          - in: path
            name: filter_id
            required: True
            schema:
              type: integer
        requestBody:
          content:
            application/json:
              schema: FilterNoID
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
        active = data.get('active', None)
        active_fid = data.get('active_fid', None)
        if (active, active_fid).count(None) != 1:
            return self.error(
                "One and only one of (active, active_fid) must be set"
            )

        acls = [acl.id for acl in self.current_user.acls]

        if "System admin" in acls or "Manage groups" in acls:
            f = DBSession().query(Filter).get(filter_id)
        else:
            f = (
                DBSession()
                .query(Filter)
                .filter(
                    Filter.id == filter_id,
                    Filter.group_id.in_(
                        [g.id for g in self.current_user.accessible_groups]
                    ),
                )
                .first()
            )
        if f is None:
            return self.error("Invalid filter ID.")

        group_id = f.group_id

        base_url = f"{self.cfg['app.kowalski.protocol']}://" \
                   f"{self.cfg['app.kowalski.host']}:{self.cfg['app.kowalski.port']}"
        headers = {"Authorization": f"Bearer {self.cfg['app.kowalski.token']}"}

        data = {
            "group_id": group_id,
            "filter_id": filter_id,
        }

        if active is not None:
            data["active"] = bool(active)
        if active_fid is not None:
            data["active_fid"] = str(active_fid)

        resp = s.put(
            os.path.join(base_url, f'api/filters'),
            headers=headers,
            json=data,
            timeout=5
        )

        if resp.status_code == requests.codes.ok:
            data = bj.loads(resp.text).get('data')
            return self.success(data=data)
        else:
            return self.error(f"Failed to update filter on Kowalski: {resp.text}")

    @auth_or_token
    def delete(self, filter_id):
        """
        ---
        description: Delete a filter
        parameters:
          - in: path
            name: filter_id
            required: true
            schema:
              type: integer
        responses:
          200:
            content:
              application/json:
                schema: Success
        """
        acls = [acl.id for acl in self.current_user.acls]

        if "System admin" in acls or "Manage groups" in acls:
            f = DBSession().query(Filter).get(filter_id)
        else:
            f = (
                DBSession()
                .query(Filter)
                .filter(
                    Filter.id == filter_id,
                    Filter.group_id.in_(
                        [g.id for g in self.current_user.accessible_groups]
                    ),
                )
                .first()
            )
        if f is None:
            return self.error("Invalid filter ID.")

        group_id = f.group_id

        base_url = f"{self.cfg['app.kowalski.protocol']}://" \
                   f"{self.cfg['app.kowalski.host']}:{self.cfg['app.kowalski.port']}"
        headers = {"Authorization": f"Bearer {self.cfg['app.kowalski.token']}"}

        data = {
            "group_id": group_id,
            "filter_id": filter_id,
        }

        resp = s.delete(
            os.path.join(base_url, f'api/filters'),
            headers=headers,
            json=data,
            timeout=5
        )

        if resp.status_code == requests.codes.ok:
            data = bj.loads(resp.text).get('data')
            return self.success(data=data)
        else:
            return self.error(f"Failed to delete filter on Kowalski: {resp.text}")
