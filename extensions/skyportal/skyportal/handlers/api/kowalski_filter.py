from penquins import Kowalski

from baselayer.log import make_log
from baselayer.app.access import auth_or_token, permissions
from baselayer.app.env import load_env
from ..base import BaseHandler
from ...models import Filter, Stream, Allocation, User


env, cfg = load_env()
log = make_log("kowalski_filter")


try:
    kowalski = Kowalski(
        token=cfg["app.kowalski.token"],
        protocol=cfg["app.kowalski.protocol"],
        host=cfg["app.kowalski.host"],
        port=int(cfg["app.kowalski.port"]),
        timeout=10,
    )
    connection_ok = kowalski.ping()
    log(f"Kowalski connection OK: {connection_ok}")
    if not connection_ok:
        kowalski = None
except Exception as e:
    log(f"Kowalski connection failed: {str(e)}")
    kowalski = None


class KowalskiFilterHandler(BaseHandler):
    @auth_or_token
    def get(self, filter_id):
        """
        ---
        single:
          description: Retrieve a filter as stored on Kowalski
          tags:
            - filters
            - kowalski
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
                  schema:
                    type: object
                    required:
                      - status
                      - message
                      - data
                    properties:
                      status:
                        type: string
                        enum: [success]
                      message:
                        type: string
                      data:
                        type: object
            400:
              content:
                application/json:
                  schema: Error
        """
        if kowalski is None:
            return self.error("Couldn't connect to Kowalski")

        with self.Session() as session:
            stmt = Filter.select(session.user_or_token).where(
                Filter.id == int(filter_id)
            )
            f = session.scalars(stmt).first()
            if f is None:
                return self.error(f"No filter with ID: {filter_id}")

            response = kowalski.api(
                method="get",
                endpoint=f"api/filters/{filter_id}",
            )
            data = response.get("data")
            # drop monogdb's _id's which are not (default) JSON-serializable
            if data is not None:
                data.pop("_id", None)
            status = response.get("status")
            if status == "error":
                message = response.get("message")
                return self.error(message=message)
            return self.success(data=data)

    @auth_or_token
    def post(self, filter_id):
        """
        ---
        description: POST a new filter version.
        tags:
          - filters
          - kowalski
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
                          required:
                            - filter_id
                            - pipeline
                          properties:
                            pipeline:
                              type: array
                              items:
                                type: object
                              description: "user-defined aggregation pipeline stages in MQL"
                              minItems: 1
        """
        if kowalski is None:
            return self.error("Couldn't connect to Kowalski")

        data = self.get_json()
        pipeline = data.get("pipeline", None)
        if pipeline is None:
            return self.error("Missing pipeline parameter")

        with self.Session() as session:
            stmt = Filter.select(session.user_or_token).where(
                Filter.id == int(filter_id)
            )
            f = session.scalars(stmt).first()
            if f is None:
                return self.error(f"No filter with ID: {filter_id}")

            group_id = f.group_id

            stmt = Stream.select(session.user_or_token).where(
                Stream.id == int(f.stream_id)
            )
            stream = session.scalars(stmt).first()
            if f is None:
                return self.error(f"No stream with ID: {filter_id}")

            post_data = {
                "group_id": group_id,
                "filter_id": int(filter_id),
                "catalog": stream.altdata["collection"],
                "permissions": stream.altdata["selector"],
                "pipeline": pipeline,
            }
            response = kowalski.api(
                method="post",
                endpoint="api/filters",
                data=post_data,
            )
            data = response.get("data")
            if data is not None:
                data.pop("_id", None)
            status = response.get("status")
            if status == "error":
                message = response.get("message")
                return self.error(message=message)
            return self.success(data=data)

    @auth_or_token
    def patch(self, filter_id):
        """
        ---
        description: Update a filter on Kowalski
        tags:
          - filters
          - kowalski
        parameters:
          - in: path
            name: filter_id
            required: True
            schema:
              type: integer
        requestBody:
          content:
            application/json:
              schema:
                type: object
                required:
                  - filter_id
                properties:
                  filter_id:
                    type: integer
                    description: "[fritz] science program filter id for this user group id"
                    minimum: 1
                  active:
                    type: boolean
                    description: "activate or deactivate filter"
                  active_fid:
                    description: "set fid as active version"
                    type: string
                    minLength: 6
                    maxLength: 6
                  autosave:
                    type: boolean | dict
                    description: "automatically save passing candidates to filter's group"
                  update_annotations:
                    type: boolean
                    description: "update annotations for existing candidates"
                  auto_followup:
                    type: boolean | dict
                    description: "automatically create follow-up requests for passing and autosaved candidates"

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
        if kowalski is None:
            return self.error("Couldn't connect to Kowalski")

        data = self.get_json()
        active = data.get("active", None)
        active_fid = data.get("active_fid", None)
        autosave = data.get("autosave", None)
        update_annotations = data.get("update_annotations", None)
        auto_followup = data.get("auto_followup", None)
        if (active, active_fid, autosave, update_annotations, auto_followup).count(
            None
        ) == 5:
            return self.error(
                "At least one of (active, active_fid, autosave, update_annotations, auto_followup) must be set"
            )

        with self.Session() as session:
            stmt = Filter.select(session.user_or_token).where(
                Filter.id == int(filter_id)
            )
            f = session.scalars(stmt).first()
            if f is None:
                return self.error(f"No filter with ID: {filter_id}")

        # get the existing filter
        response = kowalski.api(
            method="get",
            endpoint=f"api/filters/{filter_id}",
        )
        if response.get("status") == "error":
            return self.error(message=response.get("message"))
        existing_data = response.get("data")

        patch_data = {"filter_id": int(filter_id)}

        if active is not None:
            patch_data["active"] = bool(active)
        if active_fid is not None:
            patch_data["active_fid"] = str(active_fid)
        if autosave is not None:
            # autosave can either be a boolean or a dict
            if not isinstance(autosave, dict):
                autosave = {"active": bool(autosave)}
            else:
                valid_keys = {
                    "active",
                    "pipeline",
                    "comment",
                    "ignore_group_ids",
                    "saver_id",
                }
                if not set(autosave.keys()).issubset(valid_keys):
                    return self.error(
                        f"autosave dict keys must be a subset of {valid_keys}"
                    )
                if "saver_id" in autosave:
                    with self.Session() as session:
                        # before enforcing the group_admin | system_admin permission check,
                        # we check if the saver_id is different from the current filter
                        # if it is the same, we skip the permission check
                        if (
                            autosave["saver_id"]
                            != existing_data.get("autosave", {}).get("saver_id")
                            and not self.current_user.is_system_admin
                        ):
                            filter = session.scalar(
                                Filter.select(session.user_or_token).where(
                                    Filter.id == filter_id
                                )
                            )
                            filter_group_users = filter.group.group_users
                            if not any(
                                [
                                    group_user.user_id == self.associated_user_object.id
                                    and group_user.admin
                                    for group_user in filter_group_users
                                ]
                            ):
                                return self.error(
                                    "You do not have permission to set the saver_id for this filter"
                                )

                        saver_id = autosave["saver_id"]
                        if saver_id is not None:
                            try:
                                saver_id = int(saver_id)
                            except ValueError:
                                return self.error(
                                    f"Invalid saver_id: {saver_id}, must be an integer"
                                )
                            user = session.scalar(
                                User.select(session.user_or_token).where(
                                    User.id == saver_id
                                )
                            )
                            if user is None:
                                return self.error(
                                    f"User with id {saver_id} not found, can't use as saver_id for auto_followup"
                                )
                            autosave["saver_id"] = user.id
            patch_data["autosave"] = autosave
        if update_annotations is not None:
            patch_data["update_annotations"] = bool(update_annotations)
        if auto_followup is not None:
            if not isinstance(auto_followup, dict):
                return self.error("auto_followup must be a dict")
            if "active" not in auto_followup:
                return self.error(
                    "auto_followup dict must at least contain 'active' key"
                )
            valid_keys = {
                "active",
                "allocation_id",
                "payload",
                "pipeline",
                "comment",
                "priority",
                "target_group_ids",
                "validity_days",
                "priority_order",
                "radius",
                "implements_update",
            }
            if not set(auto_followup.keys()).issubset(valid_keys):
                return self.error(
                    f"auto_followup dict keys must be a subset of {valid_keys}"
                )
            # query the allocation by id
            allocation_id = auto_followup.get("allocation_id", None)
            if allocation_id is None:
                return self.error("auto_followup dict must contain 'allocation_id' key")
            with self.Session() as session:
                allocation = session.scalar(
                    Allocation.select(session.user_or_token).where(
                        Allocation.id == allocation_id
                    )
                )
                if allocation is None:
                    return self.error(f"Allocation {allocation_id} not found")
                try:
                    facility_api = allocation.instrument.api_class
                except Exception as e:
                    return self.error(
                        f"Could not get facility API of allocation {allocation_id}: {e}"
                    )

                priority_order = facility_api.priorityOrder
                if priority_order not in ["asc", "desc"]:
                    return self.error(
                        "priority order of allocation must be one of ['asc', 'desc']"
                    )

                auto_followup["priority_order"] = priority_order

                auto_followup["implements_update"] = facility_api.implements()["update"]

            patch_data["auto_followup"] = auto_followup

        response = kowalski.api(
            method="patch",
            endpoint="api/filters",
            data=patch_data,
        )
        data = response.get("data")
        if data is not None:
            data.pop("_id", None)
        status = response.get("status")
        if status == "error":
            message = response.get("message")
            return self.error(message=message)
        return self.success(data=data)

    @permissions(["System admin"])
    def delete(self, filter_id):
        """
        ---
        description: Delete a filter on Kowalski
        tags:
          - filters
          - kowalski
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
        if kowalski is None:
            return self.error("Couldn't connect to Kowalski")

        with self.Session() as session:
            stmt = Filter.select(session.user_or_token).where(
                Filter.id == int(filter_id)
            )
            f = session.scalars(stmt).first()
            if f is None:
                return self.error(f"No filter with ID: {filter_id}")

            response = kowalski.api(
                method="patch",
                endpoint=f"api/filters/{filter_id}",
            )
            status = response.get("status")
            if status == "error":
                message = response.get("message")
                return self.error(message=message)
            return self.success()
