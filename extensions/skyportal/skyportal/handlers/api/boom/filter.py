# from pymongo import MongoClient
from datetime import datetime, timedelta

import requests
from marshmallow.exceptions import ValidationError
from sqlalchemy.orm import joinedload
from sqlalchemy.orm.attributes import flag_modified

from baselayer.app.access import auth_or_token, permissions
from baselayer.app.env import load_env
from baselayer.log import make_log

from ....models import Filter
from ...base import BaseHandler

log = make_log("app/boom-filter")

_, cfg = load_env()


def get_boom_url():
    try:
        ports_to_ignore = [443, 80]
        return f"{cfg['boom.protocol']}://{cfg['boom.host']}" + (
            f":{int(cfg['boom.port'])}"
            if (
                isinstance(cfg["boom.port"], int)
                and int(cfg["boom.port"]) not in ports_to_ignore
            )
            else ""
        )
    except Exception as e:
        log(f"Error getting Boom URL: {e}")
        return None


def get_boom_credentials():
    username = cfg["boom.username"]
    password = cfg["boom.password"]
    return {"username": username, "password": password}


boom_url = get_boom_url()
boom_credentials = get_boom_credentials()


def get_boom_token():
    try:
        if boom_url is None:
            return None, None
        auth_url = f"{boom_url}/auth"
        current_time = datetime.utcnow()
        auth_response = requests.post(
            auth_url,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data=boom_credentials,
        )
        auth_response.raise_for_status()
        data = auth_response.json()
        token = data["access_token"]
        expires_at = None
        if data.get("expires_in"):
            expires_in = int(data["expires_in"])
            expires_at = current_time + timedelta(seconds=expires_in)
        return token, expires_at
    except Exception as e:
        log(f"Error getting Boom token: {e}")
        return None, None


boom_token, boom_token_expires_at = get_boom_token()


def boom_available(func):
    def wrapper(*args, **kwargs):
        global boom_url
        global boom_credentials
        # we should have a boom_url
        if boom_url is None or boom_credentials is None:
            raise ValueError("Boom is not available")
        # if we don't have a token or it's about to expire (<30min), get another one
        global boom_token
        global boom_token_expires_at
        if boom_token is None or (
            boom_token_expires_at is not None
            and boom_token_expires_at < datetime.utcnow() + timedelta(seconds=1800)
        ):
            boom_token, boom_token_expires_at = get_boom_token()
        if boom_token is None:
            raise ValueError("Boom is not available")
        return func(*args, **kwargs)

    return wrapper


class BoomFilterHandler(BaseHandler):
    @auth_or_token
    @boom_available
    def get(self, filter_id):
        """
        ---
        summary: Get a filter
        description: Retrieve a filter
        tags:
          - filters
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
        with self.Session() as session:
            if filter_id is not None:
                f = session.scalar(
                    Filter.select(
                        session.user_or_token, options=[joinedload(Filter.stream)]
                    ).where(Filter.id == filter_id)
                )
                if f is None:
                    return self.error(f"Cannot find a filter with ID: {filter_id}.")

                if f.altdata is not None and "boom" in f.altdata:
                    url = f"{boom_url}/filters/{f.altdata['boom']['filter_id']}"

                    headers = {
                        "Authorization": f"Bearer {boom_token}",
                    }
                    response = requests.get(url, headers=headers)
                    response.raise_for_status()

                    f = session.scalar(
                        Filter.select(
                            session.user_or_token, options=[joinedload(Filter.stream)]
                        ).where(
                            Filter.altdata["boom"]["filter_id"].astext
                            == str(response.json()["data"]["id"])
                        )
                    )
                    f.fv = response.json()["data"]["fv"]
                    f.active_fid = response.json()["data"]["active_fid"]
                    f.active = response.json()["data"]["active"]
                    f.filters = f.altdata["filters"]

                return self.success(data=f)

            filters = session.scalars(Filter.select(session.user_or_token)).all()
            return self.success(data=filters)

    @permissions(["Upload data"])
    @boom_available
    def post(self, filter_id=None):
        """
        ---
        summary: Create a new filter
        description: POST a new filter.
        tags:
          - filters
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
        with self.Session() as session:
            if filter_id is not None:
                f = session.scalar(
                    Filter.select(session.user_or_token, mode="update").where(
                        Filter.id == filter_id
                    )
                )

                if f is None:
                    return self.error(f"Cannot find a filter with ID: {filter_id}.")

                if not f.altdata:
                    data_url = f"{boom_url}/filters"
                    data_payload = {
                        "name": data["name"],
                        "pipeline": data["altdata"],
                        "permissions": {
                            f.stream.altdata["collection"].split("_")[
                                0
                            ]: f.stream.altdata["selector"]
                        },
                        "survey": f.stream.altdata["collection"].split("_")[0],
                    }

                    headers = {
                        "Authorization": f"Bearer {boom_token}",
                        "Content-Type": "application/json",
                    }

                    response = requests.post(
                        data_url, json=data_payload, headers=headers
                    )
                    response.raise_for_status()
                    data = {
                        "altdata": {
                            "boom": {"filter_id": response.json()["data"]["id"]},
                            "autoAnnotate": False,
                            "autoSave": False,
                            "autoFollowup": False,
                            "filters": [
                                {
                                    "fid": response.json()["data"]["active_fid"],
                                    "version": data["filters"],
                                }
                            ],
                        },
                    }
                else:
                    data_url = (
                        f"{boom_url}/filters/{f.altdata['boom']['filter_id']}/versions"
                    )
                    data_payload = {
                        "pipeline": data["altdata"],
                    }

                    headers = {
                        "Authorization": f"Bearer {boom_token}",
                        "Content-Type": "application/json",
                    }
                    response = requests.post(
                        data_url, json=data_payload, headers=headers
                    )
                    response.raise_for_status()

                    f.altdata["filters"].append(
                        {
                            "fid": response.json()["data"]["fid"],
                            "version": data["filters"],
                        }
                    )
                    flag_modified(f, "altdata")
                    data = {}

                for k in data:
                    setattr(f, k, data[k])

            schema = Filter.__schema__()
            try:
                fil = schema.load(data, partial=bool(filter_id))
            except ValidationError as e:
                return self.error(
                    f"Invalid/missing parameters: {e.normalized_messages()}"
                )

            if filter_id is None:
                session.add(fil)
            session.commit()
            return self.success(data={"id": fil.id})

    @permissions(["Upload data"])
    @boom_available
    def patch(self, filter_id):
        """
        ---
        summary: Update a filter
        description: Update filter name
        tags:
          - filters
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
        with self.Session() as session:
            f = session.scalar(
                Filter.select(session.user_or_token, mode="update").where(
                    Filter.id == filter_id
                )
            )
            if f is None:
                return self.error(f"Cannot find a filter with ID: {filter_id}.")

            data = self.get_json()
            if "active" in data or "active_fid" in data:
                data_url = f"{boom_url}/filters/{f.altdata['boom']['filter_id']}"
                data_payload = {
                    # Your data here, e.g. for /filters:
                    "active": data["active"],
                    "active_fid": data["active_fid"],
                }

                # Step 3: Send the PATCH request with the token
                headers = {
                    "Authorization": f"Bearer {boom_token}",
                    "Content-Type": "application/json",
                }
                response = requests.patch(data_url, json=data_payload, headers=headers)
                response.raise_for_status()
            elif "autoAnnotate" in data:
                f.altdata["autoAnnotate"] = data["autoAnnotate"]
                flag_modified(f, "altdata")
            elif "autoSave" in data:
                f.altdata["autoSave"] = data["autoSave"]
                flag_modified(f, "altdata")
            elif "autoFollowup" in data:
                f.altdata["autoFollowup"] = data["autoFollowup"]
                flag_modified(f, "altdata")

            data = {}

            schema = Filter.__schema__()
            try:
                schema.load(data, partial=True)
            except ValidationError as e:
                return self.error(
                    f"Invalid/missing parameters: {e.normalized_messages()}"
                )

            for k in data:
                setattr(f, k, data[k])

            session.commit()
            return self.success()

    @permissions(["Upload data"])
    @boom_available
    def delete(self, filter_id):
        """
        ---
        summary: Delete a filter
        description: Delete a filter
        tags:
          - filters
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

        with self.Session() as session:
            f = session.scalars(
                Filter.select(session.user_or_token, mode="delete").where(
                    Filter.id == filter_id
                )
            ).first()
            if f is None:
                return self.error(f"Cannot find a filter with ID: {filter_id}.")
            session.delete(f)
            session.commit()
            return self.success()
