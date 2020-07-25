from sqlalchemy.orm import joinedload
from marshmallow.exceptions import ValidationError
from baselayer.app.access import permissions, auth_or_token
from .user import add_user_and_setup_groups
from ..base import BaseHandler
from ...models import DBSession, Group, GroupUser, Filter, User, Token


class GroupHandler(BaseHandler):
    @auth_or_token
    def get(self, group_id=None):
        """
        ---
        single:
          description: Retrieve a group
          parameters:
            - in: path
              name: group_id
              required: true
              schema:
                type: integer
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
                            allOf:
                              - $ref: '#/components/schemas/Group'
                              - type: object
                                properties:
                                  users:
                                    type: array
                                    items:
                                      - $ref: '#/components/schemas/User'
                                    description: List of group users
            400:
              content:
                application/json:
                  schema: Error
        multiple:
          description: Retrieve all groups
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
                              user_groups:
                                type: array
                                items:
                                  $ref: '#/components/schemas/Group'
                                description: List of groups current user is a member of.
                              all_groups:
                                type: array
                                items:
                                  $ref: '#/components/schemas/Group'
                                description: List of all groups if current user is Super admin, else None.
            400:
              content:
                application/json:
                  schema: Error
        """
        if group_id is not None:
            if 'Manage groups' in [acl.id for acl in self.current_user.acls]:
                group = Group.query.options(joinedload(Group.users)).options(
                    joinedload(Group.group_users)).get(group_id)
            else:
                group = Group.query.options([
                    joinedload(Group.users).load_only(User.id, User.username)]
                ).get(group_id)
                if group is not None and group.id not in [
                        g.id for g in self.current_user.groups]:
                    return self.error('Insufficient permissions.')
            if group is not None:
                group = group.to_dict()
                # Do not include User.groups to avoid circular reference
                group['users'] = [{'id': user.id, 'username': user.username}
                                  for user in group['users']]
                # grab filters:
                filters = (
                    DBSession().query(Filter)
                    .filter(Filter.group_id.in_([group_id]))
                    .all()
                )
                group['filters'] = filters
                return self.success(data=group)
            return self.error(f"Could not load group with ID {group_id}")

        include_single_user_groups = self.get_query_argument("includeSingleUserGroups",
                                                             False)
        info = {}
        info['user_groups'] = list(self.current_user.groups)
        info['all_groups'] = (list(Group.query) if 'Super admin' in
                              [role.id for role in self.associated_user_object.roles]
                              else None)
        if (not include_single_user_groups) or (include_single_user_groups == "false"):
            info["user_groups"] = [g for g in info["user_groups"]
                                   if not g.single_user_group]
            if info["all_groups"]:
                info["all_groups"] = [g for g in info["all_groups"]
                                      if not g.single_user_group]
        return self.success(data=info)

    @permissions(['Manage groups'])
    def post(self):
        """
        ---
        description: Create a new group
        requestBody:
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/GroupNoID'
                  - type: object
                    properties:
                      group_admins:
                        type: array
                        items:
                          type: string
                        description: |
                          List of emails of users to be group admins. Current user will
                          automatically be added as a group admin.
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
                              description: New group ID
        """
        data = self.get_json()

        group_admin_emails = [e.strip() for e in data.get('group_admins', [])
                              if e.strip()]
        group_admins = list(User.query.filter(User.username.in_(
            group_admin_emails)))
        if self.current_user not in group_admins and not isinstance(self.current_user, Token):
            group_admins.append(self.current_user)

        g = Group(name=data['name'])
        DBSession().add(g)
        DBSession().flush()
        DBSession().add_all(
            [GroupUser(group=g, user=user, admin=True) for user in group_admins])
        DBSession().commit()

        self.push_all(action='skyportal/FETCH_GROUPS')
        return self.success(data={"id": g.id})

    @permissions(['Manage groups'])
    def put(self, group_id):
        """
        ---
        description: Update a group
        parameters:
          - in: path
            name: group_id
            schema:
              type: integer
        requestBody:
          content:
            application/json:
              schema: GroupNoID
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
        data['id'] = group_id

        schema = Group.__schema__()
        try:
            schema.load(data)
        except ValidationError as e:
            return self.error('Invalid/missing parameters: '
                              f'{e.normalized_messages()}')
        DBSession().commit()

        return self.success(action='skyportal/FETCH_GROUPS')

    @permissions(['Manage groups'])
    def delete(self, group_id):
        """
        ---
        description: Delete a group
        parameters:
          - in: path
            name: group_id
            required: true
            schema:
              type: integer
        responses:
          200:
            content:
              application/json:
                schema: Success
        """
        g = Group.query.get(group_id)
        DBSession().delete(g)
        DBSession().commit()

        self.push_all(action='skyportal/REFRESH_GROUP', payload={'group_id': int(group_id)})
        self.push_all(action='skyportal/FETCH_GROUPS')
        return self.success()


class GroupUserHandler(BaseHandler):
    @permissions(['Manage groups'])
    def post(self, group_id, username):
        """
        ---
        description: Add a group user
        parameters:
          - in: path
            name: group_id
            required: true
            schema:
              type: integer
          - in: path
            name: username
            required: true
            schema:
              type: string
        requestBody:
          content:
            application/json:
              schema:
                type: object
                properties:
                  admin:
                    type: boolean
                required:
                  - admin
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
                            group_id:
                              type: integer
                              description: Group ID
                            user_id:
                              type: integer
                              description: User ID
                            admin:
                              type: boolean
                              description: Boolean indicating whether user is group admin
        """
        data = self.get_json()
        admin = data.pop("admin", False)
        group_id = int(group_id)
        group = Group.query.get(group_id)
        if group.single_user_group:
            return self.error("Cannot add users to single user groups.")
        user = User.query.filter(User.username == username.lower()).first()
        if user is None:
            user_id = add_user_and_setup_groups(
                username=username,
                roles=["Full user"],
                group_ids_and_admin=[[group_id, admin]]
            )
        else:
            user_id = user.id
            # Just add new GroupUser
            gu = GroupUser.query.filter(
                GroupUser.group_id == group_id
            ).filter(
                GroupUser.user_id == user_id
            ).first()
            if gu is None:
                DBSession.add(
                    GroupUser(group_id=group_id, user_id=user_id, admin=admin)
                )
            else:
                return self.error(
                    "Specified user is already associated with this group."
                )
        DBSession().commit()

        self.push_all(action='skyportal/REFRESH_GROUP',
                      payload={'group_id': group_id})
        return self.success(data={'group_id': group_id, 'user_id': user_id,
                                  'admin': admin})

    @permissions(['Manage groups'])
    def delete(self, group_id, username):
        """
        ---
        description: Delete a group user
        parameters:
          - in: path
            name: group_id
            required: true
            schema:
              type: integer
          - in: path
            name: username
            required: true
            schema:
              type: string
        responses:
          200:
            content:
              application/json:
                schema: Success
        """
        group = Group.query.get(group_id)
        if group.single_user_group:
            return self.error("Cannot delete users from single user groups.")
        user_id = User.query.filter(User.username == username).first().id
        (GroupUser.query.filter(GroupUser.group_id == group_id)
         .filter(GroupUser.user_id == user_id).delete())
        DBSession().commit()
        self.push_all(action='skyportal/REFRESH_GROUP',
                      payload={'group_id': int(group_id)})
        return self.success()
