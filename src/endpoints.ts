import { Pool } from 'pg';
import { type Request, type Response, Router } from 'express';
import { callDB, type CallData, type JSONResult, type ParamValidator } from './db.ts';
import { z } from 'zod';


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

//==================== API endpoints ====================//

router.get('/health', (req: Request, res: Response) => { res.status(200).json("working 😎"); });

export default router;

//--------------- Users ---------------//
router.post('/user/create', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: "delete_local_role", params: req.body.json() };

  sendResponse(res, await callDB(dbPool, call));
});



//---


router.get('/user/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_user_by_id', params: { user_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});


router.get('/user/email/:email', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_user_by_email', params: { email: req.params.email } };
  sendResponse(res, await callDB(dbPool, call));
});

router.put('/user/:id', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'proc',
    call: 'update_user',
    params: { ...req.body, user_id: req.params.id }
  };
  sendResponse(res, await callDB(dbPool, call));
});

router.delete('/user/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'delete_user', params: { user_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});


//--------------- Teams ---------------//
router.post('/team/create', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'create_team', params: req.body };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/team/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_team_by_id', params: { team_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});

router.put('/team/:id', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'proc',
    call: 'update_team',
    params: { ...req.body, team_id: req.params.id }
  };
  sendResponse(res, await callDB(dbPool, call));
});

router.delete('/team/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'delete_team', params: { team_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});


//--------------- Membership ---------------//
router.post('/team-membership/add', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'add_team_member', params: req.body };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/team-membership/user/:user_id/team/:team_id', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'func',
    call: 'get_team_membership',
    params: { user_id: req.params.user_id, team_id: req.params.team_id }
  };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/team/:team_id/members', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_team_members', params: { team_id: req.params.team_id } };
  sendResponse(res, await callDB(dbPool, call));
});

router.delete('/team-membership/user/:user_id/team/:team_id', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'proc',
    call: 'remove_team_member',
    params: { user_id: req.params.user_id, team_id: req.params.team_id }
  };
  sendResponse(res, await callDB(dbPool, call));
});


//--------------- Statuses ---------------//
router.post('/status/create', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'create_status', params: req.body };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/status/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_status_by_id', params: { status_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/status/name/:name', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_status_by_name', params: { name: req.params.name } };
  sendResponse(res, await callDB(dbPool, call));
});

router.put('/status/:id', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'proc',
    call: 'update_status',
    params: { status_id: req.params.id, name: req.body.name }
  };
  sendResponse(res, await callDB(dbPool, call));
});

router.delete('/status/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'delete_status', params: { status_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});


//--------------- Todos ---------------//
router.post('/todo/create', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'create_todo', params: req.body };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/todo/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_todo_by_id', params: { todo_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/team/:team_id/todos', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_team_todos', params: { team_id: req.params.team_id } };
  sendResponse(res, await callDB(dbPool, call));
});

router.put('/todo/:id', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'proc',
    call: 'update_todo',
    params: { ...req.body, todo_id: req.params.id }
  };
  sendResponse(res, await callDB(dbPool, call));
});

router.delete('/todo/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'delete_todo', params: { todo_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});

//--------------- Roles: Global ---------------//
router.post('/global-role/create', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'create_global_role', params: req.body };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/global-role/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_global_role_by_id', params: { role_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/global-role/name/:name', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_global_role_by_name', params: { name: req.params.name } };
  sendResponse(res, await callDB(dbPool, call));
});

router.put('/global-role/:id', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'proc',
    call: 'update_global_role',
    params: { role_id: req.params.id, name: req.body.name }
  };
  sendResponse(res, await callDB(dbPool, call));
});

router.delete('/global-role/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'delete_global_role', params: { role_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});

router.post('/user/:user_id/global-role/:role_id/assign', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'proc',
    call: 'assign_global_role',
    params: { user_id: req.params.user_id, role_id: req.params.role_id }
  };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/user/:user_id/global-roles', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_user_global_roles', params: { user_id: req.params.user_id } };
  sendResponse(res, await callDB(dbPool, call));
});

router.delete('/user/:user_id/global-role/:role_id/revoke', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'proc',
    call: 'revoke_global_role',
    params: { user_id: req.params.user_id, role_id: req.params.role_id }
  };
  sendResponse(res, await callDB(dbPool, call));
});


//--------------- Roles: Local ---------------//
router.post('/local-role/create', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'create_local_role', params: req.body };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/local-role/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_local_role_by_id', params: { role_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/local-role/name/:name', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_local_role_by_name', params: { name: req.params.name } };
  sendResponse(res, await callDB(dbPool, call));
});

router.put('/local-role/:id', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'proc',
    call: 'update_local_role',
    params: { role_id: req.params.id, name: req.body.name }
  };
  sendResponse(res, await callDB(dbPool, call));
});

router.delete('/local-role/:id', async (req: Request, res: Response) => {
  const call: CallData = { type: 'proc', call: 'delete_local_role', params: { role_id: req.params.id } };
  sendResponse(res, await callDB(dbPool, call));
});

router.post('/team-membership/:member_id/local-role/:role_id/assign', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'proc',
    call: 'assign_local_role',
    params: { member_id: req.params.member_id, role_id: req.params.role_id }
  };
  sendResponse(res, await callDB(dbPool, call));
});

router.get('/team-membership/:member_id/local-roles', async (req: Request, res: Response) => {
  const call: CallData = { type: 'func', call: 'get_member_local_roles', params: { member_id: req.params.member_id } };
  sendResponse(res, await callDB(dbPool, call));
});

router.delete('/team-membership/:member_id/local-role/:role_id/revoke', async (req: Request, res: Response) => {
  const call: CallData = {
    type: 'proc',
    call: 'revoke_local_role',
    params: { member_id: req.params.member_id, role_id: req.params.role_id }
  };
  sendResponse(res, await callDB(dbPool, call));
});