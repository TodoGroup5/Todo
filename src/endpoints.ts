import { Pool } from 'pg';
import { type Request, type Response, Router } from 'express';
import { CallData, callDB, CallName, CallType, InvalidList, ParamValidator, parseParams, ParseParamsResult, TableResult, type JSONResult } from './db.js';
import { Repetitions } from './types.js';
import { z_email, z_str } from './callValidators.js';
import { AuthenticatedRequest, authenticateToken, comparePassHash, genJWT, hashPassword } from './auth.js';

//==================== Setup DB connection ====================//
const router = Router();
const dbPool = new Pool({
    database: process.env.DB_NAME || 'todo_db',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
});

// Helper function to handle responses
function sendResponse<S, F>(
    res: Response<JSONResult<S, F>>,
    result: JSONResult<S, F>,
    failCode: number = 500,
    formatter: (r?: S) => any = (r) => r // Optionally format the result upon success
) {
    const success = result.status === 'success';
    res.status(success ? 200 : failCode).json(success ? { status: 'success', data: formatter(result.data) } : result);
}

type ParamsDict<T = unknown> = { [key: string]: T };
type ParamFormatter<I = unknown, O = unknown> = (x: ParamsDict) => ParamsDict;

function consReqHandler(type: CallType, call: CallName, urlParamFormatter: ParamFormatter = (x) => x) {
    return async (req: Request, res: Response) => {
        console.log('BODY:', req.body);
        console.log('PARAMS:', urlParamFormatter(req.params ?? {}));
        sendResponse(
            res,
            await callDB(dbPool, {
                type,
                call,
                params: {
                    ...(req.body ?? {}),
                    ...urlParamFormatter(req.params ?? {}),
                },
            })
        );
    };
}

const allParamsToNumber: ParamFormatter<unknown, number> = (params) => {
    const res: ParamsDict<number> = {};
    Object.keys(params).forEach((key) => {
        res[key] = Number(params[key]);
        console.log('OUT:', res[key]);
    });
    return res;
};

type Method = 'get' | 'post' | 'put' | 'delete';
type Space = Repetitions<' ', 20>;
type EasyEndpointMap = {
    [key: `${Uppercase<Method>}${Space}/${string}`]: [CallType, CallName] | [CallType, CallName, ParamFormatter];
};

//==================== API endpoints ====================//

router.get('/health', (req: Request, res: Response) => {
    res.status(200).json('working 😎');
});

router.post('/login', async (req: Request, res: Response) => {
    const call: CallData = {
        type: 'proc',
        call: 'delete_local_role',
        params: req.body,
    };
    const expected: ParamValidator[] = [
        ['email', z_email],
        ['password', z_str],
    ];

    const parseRes: ParseParamsResult = parseParams(call, expected);
    if (parseRes.status === 'failed') {
        // TODO: Handle
        res.status(500).json({
            status: 'failed',
            error: 'invalidParams',
            data: parseRes.invalid,
        });
    } else {
    }

    const result = await callDB(dbPool, call);
    sendResponse(res, result);
});

//---------- Authentication ----------//

interface User {
    id: number;
    email: string;
    passwordHash: string;
}

const users: User[] = [{ id: 1, email: 'user@example.com', passwordHash: '' }];
(async () => (users[0].passwordHash = await hashPassword('password123')))();

// ===== LOGIN ROUTE =====
router.post('/login', async (req: Request, res: Response) => {
    // Get user details
    const { email, password } = req.body as { email: string; password: string };
    const user = users.find((u) => u.email === email);
    if (user == null) return;

    // Check password
    if (!comparePassHash(password, user.passwordHash)) {
        res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate & return JWT
    res.json({ token: genJWT(user?.id, user?.email) });
});

// Example protected route
router.get('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    res.json({
        message: 'Welcome!',
        user: (req as AuthenticatedRequest).user,
    });
});

const easyEndpoints: EasyEndpointMap = {
    //--------------- Users ---------------//
    'POST   /user/create':         ['proc', 'create_user'], // matches original, although name suggests maybe incorrect call?
    'GET    /user/all':            ['func', 'get_all_users'],
    'GET    /user/:user_id':       ['func', 'get_user_by_id', allParamsToNumber],
    'GET    /user/email/:email':   ['func', 'get_user_by_email'],
    'GET    /user/:user_id/teams': ['func', 'get_user_teams', allParamsToNumber],
    'PUT    /user/:user_id':       ['proc', 'update_user', allParamsToNumber],
    'DELETE /user/:user_id':       ['proc', 'delete_user', allParamsToNumber],

    //--------------- Teams ---------------//
    'POST   /team/create':            ['proc', 'create_team'],
    'GET    /team/all':               ['func', 'get_all_teams'],
    'GET    /team/:team_id':          ['func', 'get_team_by_id', allParamsToNumber],
    'PUT    /team/:team_id':          ['proc', 'update_team', allParamsToNumber],
    'DELETE /team/:team_id':          ['proc', 'delete_team', allParamsToNumber],

    //--------------- Membership ---------------//
    'POST   /team-membership/add':                         ['proc', 'add_team_member'],
    'GET    /team-membership/user/:user_id/team/:team_id': ['func', 'get_team_membership', allParamsToNumber],
    'GET    /team/:team_id/members':                       ['func', 'get_team_members', allParamsToNumber],
    'DELETE /team-membership/user/:user_id/team/:team_id': ['proc', 'remove_team_member', allParamsToNumber],

    //--------------- Statuses ---------------//
    'POST   /status/create':     ['proc', 'create_status'],
    'GET    /status/all':        ['func', 'get_all_statuses'],
    'GET    /status/:status_id': ['func', 'get_status_by_id', allParamsToNumber],
    'GET    /status/name/:name': ['func', 'get_status_by_name'],
    'PUT    /status/:status_id': ['proc', 'update_status', allParamsToNumber],
    'DELETE /status/:status_id': ['proc', 'delete_status', allParamsToNumber],

    //--------------- Todos ---------------//
    'POST   /todo/create':                       ['proc', 'create_todo'],
    'GET    /todo/:todo_id':                     ['func', 'get_todo_by_id', allParamsToNumber],
    'GET    /user/:user_id/todos':               ['func', 'get_user_todos', allParamsToNumber],
    'GET    /team/:team_id/user/:user_id/todos': ['func', 'get_member_todos', allParamsToNumber],
    'GET    /team/:team_id/todos':               ['func', 'get_team_todos', allParamsToNumber],
    'PUT    /todo/:todo_id':                     ['proc', 'update_todo', allParamsToNumber],
    'DELETE /todo/:todo_id':                     ['proc', 'delete_todo', allParamsToNumber],

    //--------------- Roles: Global ---------------//
    'POST   /global-role/create':                        ['proc', 'create_global_role'],
    'GET    /global-role/all':                           ['func', 'get_all_global_roles'],
    'GET    /global-role/:role_id':                      ['func', 'get_global_role_by_id', allParamsToNumber],
    'GET    /global-role/name/:name':                    ['func', 'get_global_role_by_name'],
    'PUT    /global-role/:role_id':                      ['proc', 'update_global_role', allParamsToNumber],
    'DELETE /global-role/:role_id':                      ['proc', 'delete_global_role', allParamsToNumber],
    'POST   /user/:user_id/global-role/:role_id/assign': ['proc', 'assign_global_role', allParamsToNumber],
    'GET    /user/:user_id/global-roles':                ['func', 'get_user_global_roles', allParamsToNumber],
    'DELETE /user/:user_id/global-role/:role_id/revoke': ['proc', 'revoke_global_role', allParamsToNumber],

    //--------------- Roles: Local ---------------//
    'POST   /local-role/create':                                     ['proc', 'create_local_role'],
    'GET    /local-role/all':                                        ['func', 'get_all_local_roles'],
    'GET    /local-role/:role_id':                                   ['func', 'get_local_role_by_id', allParamsToNumber],
    'GET    /local-role/name/:name':                                 ['func', 'get_local_role_by_name'],
    'PUT    /local-role/:role_id':                                   ['proc', 'update_local_role', allParamsToNumber],
    'DELETE /local-role/:role_id':                                   ['proc', 'delete_local_role', allParamsToNumber],
    'POST   /team-membership/:member_id/local-role/:role_id/assign': ['proc', 'assign_local_role', allParamsToNumber],
    'GET    /team-membership/:member_id/local-roles':                ['func', 'get_member_local_roles', allParamsToNumber],
    'DELETE /team-membership/:member_id/local-role/:role_id/revoke': ['proc', 'revoke_local_role', allParamsToNumber],
};

Object.entries(easyEndpoints).forEach(([id, [type, call, fmt]]) => {
    const [method, endpt] = id.split(/\s+/);
    router[method.toLowerCase() as Method](endpt, consReqHandler(type, call, fmt));
});

export default router;
