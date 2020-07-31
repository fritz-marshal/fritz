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


class FilterHandler(BaseHandler):
    @auth_or_token
    def get(self, filter_id=None):
        """
        ---
        single:
          description: Retrieve a filter
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
        if filter_id is not None:
            f = Filter.get_if_owned_by(filter_id, self.current_user)
            if f is None:
                return self.error("Invalid filter ID.")
            # get stream:
            stream = (
                DBSession().query(Stream)
                .filter(Stream.id == f.stream_id)
                .first()
            )
            f.stream = stream
            return self.success(data=f)
        filters = (
            DBSession().query(Filter)
            .filter(Filter.group_id.in_([g.id for g in self.current_user.groups]))
            .all()
        )
        return self.success(data=filters)

    @permissions(["Manage groups"])
    def post(self):
        """
        ---
        description: POST a new filter.
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
        schema = Filter.__schema__()
        try:
            fil = schema.load(data)
        except ValidationError as e:
            return self.error(
                "Invalid/missing parameters: " f"{e.normalized_messages()}"
            )
        DBSession().add(fil)
        DBSession().commit()

        return self.success(data={"id": fil.id})

    @permissions(["Manage groups"])
    def patch(self, filter_id):
        """
        ---
        description: Update a filter
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
        data["id"] = filter_id
        schema = Filter.__schema__()
        try:
            schema.load(data)
        except ValidationError as e:
            return self.error('Invalid/missing parameters: '
                              f'{e.normalized_messages()}')
        DBSession().commit()
        return self.success()

    @permissions(["Manage groups"])
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
        DBSession().delete(Filter.query.get(filter_id))
        DBSession().commit()

        return self.success()


class FilterVHandler(BaseHandler):
    @auth_or_token
    def get(self, filter_id):
        """
        fixme:
        ---
        single:
          description: Retrieve a filter
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
        f = Filter.get_if_owned_by(filter_id, self.current_user)
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

    @permissions(["Manage groups"])
    def post(self):
        """
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
        schema = Filter.__schema__()
        try:
            fil = schema.load(data)
            print(fil)
        except ValidationError as e:
            return self.error(
                "Invalid/missing parameters: " f"{e.normalized_messages()}"
            )
        # DBSession().add(fil)
        # DBSession().commit()

        # return self.success(data={"id": fil.id})
        return self.success(data=fil)

    @permissions(["Manage groups"])
    def patch(self, filter_id):
        """
        ---
        description: Update a filter
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
        data["id"] = filter_id
        schema = Filter.__schema__()
        try:
            schema.load(data)
        except ValidationError as e:
            return self.error('Invalid/missing parameters: '
                              f'{e.normalized_messages()}')
        DBSession().commit()
        return self.success()

    @permissions(["System admin"])
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
        DBSession().delete(Filter.query.get(filter_id))
        DBSession().commit()

        return self.success()