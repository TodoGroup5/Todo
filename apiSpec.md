## GET
- [/health]

- [/user/:id]
- [/user/:user_id/global-roles]
- [/user/email/:email]

- [/team/:id]
- [/team/:team_id/members]
- [/team/:team_id/todos]

- [/team-membership/:member_id/local-roles]
- [/team-membership/user/:user_id/team/:team_id]

- [/todo/:id]

- [/status/all]
- [/status/:id]
- [/status/name/:name]
- [/global-role/all]
- [/global-role/:id]
- [/global-role/name/:name]
- [/local-role/all]
- [/local-role/:id]
- [/local-role/name/:name]

## POST
- [/user/:user_id/global-role/:role_id/assign]
- [/user/create]

- [/team-membership/:member_id/local-role/:role_id/assign]
- [/team-membership/add]
- [/team/create]

- [/todo/create]

- [/status/create]
- [/global-role/create]
- [/local-role/create]


## PUT
- [/user/:id]
- [/team/:id]
- [/todo/:id]

- [/status/:id]
- [/global-role/:id]
- [/local-role/:id]

## DELETE
- [/user/:id]
- [/user/:user_id/global-role/:role_id/revoke]
- [/team-membership/:member_id/local-role/:role_id/revoke]
- [/team-membership/user/:user_id/team/:team_id]
- [/team/:id]
- [/todo/:id]

- [/status/:id]
- [/global-role/:id]
- [/local-role/:id]