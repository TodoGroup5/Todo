import { Pool } from 'pg';
import { type Request, type Response, Router } from 'express';
import { callDB, CallName, CallType, type CallData, type JSONResult, type ParamValidator } from './db.ts';
import { Repetitions } from './types.ts';


//==================== Setup DB connection ====================//
const router = Router();
const dbPool = new Pool({
  database: 'todo_db',
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres'
});


// Helper function to handle responses
function sendResponse<S, F>(
  res: Response,
  result: JSONResult<S, F>,
  failCode: number = 500,
  formatter: (r?: S) => any = (r => r)    // Optionally format the result upon success
) {
  const success = (result.status === 'success');
  res.status(success ? 200 : failCode).json(success ? formatter(result.data) : result);
};

router.get('/health', (req: Request, res: Response) => { res.status(200).json("working 😎"); });

function consReqHandler(endpoint: string, type: CallType, call: CallName) {
  return async (req: Request, res: Response) =>
    sendResponse(res, await callDB(dbPool, { type, call, params: { ...req.body, ...req.params }}));
}

type Method = "get" | "post" | "put" | "delete";
type Space = Repetitions<" ", 20>;
type EasyEndpointMap = { [key: `${Uppercase<Method>}${Space}/${string}`]: [CallType, CallName] };

//==================== API endpoints ====================//

const easyEndpoints: EasyEndpointMap = {
  //--------------- Users ---------------//
  "POST   /user/create":        ["proc", "delete_local_role"], // matches original, although name suggests maybe incorrect call?
  "GET    /user/:id":           ["func", "get_user_by_id"],
  "GET    /user/email/:email":  ["func", "get_user_by_email"],
  "PUT    /user/:id":           ["proc", "update_user"],
  "DELETE /user/:id":           ["proc", "delete_user"],

  //--------------- Teams ---------------//
  "POST   /team/create":  ["proc", "create_team"],
  "GET    /team/:id":     ["func", "get_team_by_id"],
  "PUT    /team/:id":     ["proc", "update_team"],
  "DELETE /team/:id":     ["proc", "delete_team"],

  //--------------- Membership ---------------//
  "POST   /team-membership/add":                          ["proc", "add_team_member"],
  "GET    /team-membership/user/:user_id/team/:team_id":  ["func", "get_team_membership"],
  "GET    /team/:team_id/members":                        ["func", "get_team_members"],
  "DELETE /team-membership/user/:user_id/team/:team_id":  ["proc", "remove_team_member"],

  //--------------- Statuses ---------------//
  "POST   /status/create":      ["proc", "create_status"],
  "GET    /status/:id":         ["func", "get_status_by_id"],
  "GET    /status/name/:name":  ["func", "get_status_by_name"],
  "PUT    /status/:id":         ["proc", "update_status"],
  "DELETE /status/:id":         ["proc", "delete_status"],

  //--------------- Todos ---------------//
  "POST   /todo/create":          ["proc", "create_todo"],
  "GET    /todo/:id":             ["func", "get_todo_by_id"],
  "GET    /team/:team_id/todos":  ["func", "get_team_todos"],
  "PUT    /todo/:id":             ["proc", "update_todo"],
  "DELETE /todo/:id":             ["proc", "delete_todo"],

  //--------------- Roles: Global ---------------//
  "POST   /global-role/create":                         ["proc", "create_global_role"],
  "GET    /global-role/:id":                            ["func", "get_global_role_by_id"],
  "GET    /global-role/name/:name":                     ["func", "get_global_role_by_name"],
  "PUT    /global-role/:id":                            ["proc", "update_global_role"],
  "DELETE /global-role/:id":                            ["proc", "delete_global_role"],
  "POST   /user/:user_id/global-role/:role_id/assign":  ["proc", "assign_global_role"],
  "GET    /user/:user_id/global-roles":                 ["func", "get_user_global_roles"],
  "DELETE /user/:user_id/global-role/:role_id/revoke":  ["proc", "revoke_global_role"],

  //--------------- Roles: Local ---------------//
  "POST   /local-role/create":                                      ["proc", "create_local_role"],
  "GET    /local-role/:id":                                         ["func", "get_local_role_by_id"],
  "GET    /local-role/name/:name":                                  ["func", "get_local_role_by_name"],
  "PUT    /local-role/:id":                                         ["proc", "update_local_role"],
  "DELETE /local-role/:id":                                         ["proc", "delete_local_role"],
  "POST   /team-membership/:member_id/local-role/:role_id/assign":  ["proc", "assign_local_role"],
  "GET    /team-membership/:member_id/local-roles":                 ["func", "get_member_local_roles"],
  "DELETE /team-membership/:member_id/local-role/:role_id/revoke":  ["proc", "revoke_local_role"],
};

Object.entries(easyEndpoints).forEach(([id, [type, call]]) => {
  const [method, endpt]= id.split(' ') as [Method, string];
  router[method](endpt, consReqHandler(endpt, type, call));
});

export default router;

// NOTE: Manual implementation for reference:
//    router.post('/user/create', async (req: Request, res: Response) => 
//      sendResponse(res, await callDB(dbPool, { type: 'proc', call: "delete_local_role", params: req.body }))
//    );