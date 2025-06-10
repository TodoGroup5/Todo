import { Pool } from 'pg';
import { type Request, type Response, Router } from 'express';
import { CallData, callDB, CallName, CallType, InvalidList, ParamValidator, parseParams, ParseParamsResult, TableResult, type JSONResult } from './db.js';
import { Repetitions } from './types.js';
import { z_email, z_id, z_str, z_str_nonempty, z_str_opt } from './callValidators.js';
import { AuthenticatedRequest, authenticateToken, comparePassHash, genJWT, hashPassword } from './auth.js';
import { isProductionEnvironment } from './lib/deployment.js';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

//==================== Setup DB connection ====================//
const router = Router();
const dbConfig: any = {
    database: process.env.DB_NAME || 'todo_db',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'password',
}

if (isProductionEnvironment()) {
    dbConfig.ssl = { rejectUnauthorized: false };
}

const dbPool = new Pool(dbConfig);


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
        console.log(`\n----- CALLING ${call} -----`)
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

function paramsToNumber(specific?: string[]): ParamFormatter<unknown, number> {
    return (params) => {
        const res: ParamsDict<number> = {};
        (specific ?? Object.keys(params)).forEach((key) => {
            res[key] = Number(params[key]);
            console.log('OUT:', res[key]);
        });
        return res;
    }
}

type Method = 'get' | 'post' | 'put' | 'delete';
type Space = Repetitions<' ', 20>;
type EasyEndpointMap = {
    [key: `${Uppercase<Method>}${Space}/${string}`]: [CallType, CallName] | [CallType, CallName, ParamFormatter];
};

//==================== API endpoints ====================//

router.get('/health', (req: Request, res: Response) => {
    res.status(200).json('working 😎');
});

//---------- Authentication ----------//
type Get_UserSecrets = { id: number; name: string; email: string; password_hash: string; two_fa_secret: string };
type Post_UserCreate = { user_id: number; };

function callSuccessWithData<S>(res: JSONResult<unknown[], unknown>): res is { status: 'success', data: { 0: S } & Array<S> } {
    return res.status === 'success' && res?.data != null && (res.data?.length ?? 0) !== 0;
}

router.post('/signup', async (req: Request, res: Response) => {
    //----- Validate request params -----//
    const expected: ParamValidator[] = [ ["name", z_str_nonempty], ["email", z_email], ["password", z_str_nonempty] ];
    const parseRes: ParseParamsResult = parseParams({ params: req.body }, expected);
    if (parseRes.status === 'failed') {
        sendResponse(res, { status: 'failed', error: 'invalidParams', data: parseRes.invalid }, 400);
        return;
    }
    
    //----- Create user -----//
    const [name, email, rawPassword] = parseRes.params as string[];
    const password_hash = await hashPassword(rawPassword);
    // Generate 2FA secret immediately upon user signup
    const secret = speakeasy.generateSecret({
        name: `TodoApp-Group-5`,
        issuer: 'TodoApp',
        length: 20
    });
    const two_fa_secret = secret.base32;
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    
    const createRes = await callDB(dbPool, { type: 'func', call: 'create_user', params: { name, email, password_hash, two_fa_secret} });
    if(!callSuccessWithData<Post_UserCreate>(createRes)) {
        sendResponse(res, { status: 'failed', error: 'userCreateFailed', data: createRes }, 400);
        return;
    }

    //----- Return -----//
    res.json({ qrCode: qrCodeUrl });
});

router.post('/login', async (req: Request, res: Response) => {
    //----- Validate request params -----//
    const expected: ParamValidator[] = [["email", z_email], ["password", z_str_nonempty]];
    const parseRes: ParseParamsResult = parseParams({ params: req.body }, expected);
    if (parseRes.status === 'failed') {
        sendResponse(res, { status: 'failed', error: 'invalidParams', data: parseRes.invalid }, 400);
        return;
    }

    //----- Get user secrets -----//
    const [email, password] = parseRes.params as string[];
    const userRes = await callDB(dbPool, { type: 'func', call: 'get_user_by_email', params: { email } });
    if (!callSuccessWithData<Get_UserSecrets>(userRes)) {
        sendResponse(res, { status: 'failed', error: 'userNotFound' }, 404);
        return;
    }

    const { id: user_id, password_hash, two_fa_secret } = userRes.data[0];
    // Generate QR code using the user's existing 2FA secret
    const otpauthUrl = speakeasy.otpauthURL({
        secret: two_fa_secret,
        label: `TodoApp-Group-5`,
        issuer: 'TodoApp',
        encoding: 'base32'
    });
    
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
    //----- Check hashes match -----//
    const isValid = await comparePassHash(password, password_hash);
    if (!isValid) {
        sendResponse(res, { status: 'failed', error: 'incorrectPassword' }, 401);
        return;
    }
    //----- Return -----//
    res.json({ qrCodeUrl });
});

router.post('/login/verify', async (req: Request, res: Response) => {
    const { email, twoFactorToken } = req.body;
    const userRes = await callDB(dbPool, { type: 'func', call: 'get_user_by_email', params: { email } });
    if (!callSuccessWithData<Get_UserSecrets>(userRes)) {
        sendResponse(res, { status: 'failed', error: 'userNotFound' }, 404);
        return;
    }
    const { id: user_id, two_fa_secret } = userRes.data[0];
    // Verify the 2FA token
    const verified = speakeasy.totp.verify({
        secret: two_fa_secret,
        encoding: 'base32',
        token: twoFactorToken,
        window: 2
    });

    if (!verified) {
        return res.status(401).json({ error: 'Invalid 2FA token' });
    }
     //----- Return -----//
    res.json({ user: userRes.data[0], token: genJWT(user_id, email) });
    
});

router.post('/change-password', async (req: Request, res: Response) => {
    //----- Validate request params -----//
    const expected: ParamValidator[] = [ ['user_id', z_id], ['new_password', z_str_nonempty], ['old_password', z_str_nonempty] ];
    const parseRes: ParseParamsResult = parseParams({ params: req.body }, expected);
    if (parseRes.status === 'failed') {
        sendResponse(res, { status: 'failed', error: 'invalidParams', data: parseRes.invalid }, 400);
        return;
    };

    //----- Get user secrets -----//
    const [ user_id, new_password, old_password ] = parseRes.params as string[];
    const userRes = await callDB(dbPool, { type: 'func', call: 'get_user_secrets', params: { user_id } });
    if (!callSuccessWithData<Get_UserSecrets>(userRes)) {
        sendResponse(res, { status: 'failed', error: 'userNotFound' }, 404);
        return;
    }
    const { password_hash: old_hash } = userRes.data[0];

    //----- Check old password ----//
    if (!comparePassHash(old_password, old_hash)) {
        sendResponse(res, { status: 'failed', error: 'incorrectPassword' }, 401);
        return;
    }

    //----- Hash new password ----//
    const new_hash = await hashPassword(new_password);

    //----- Update user -----//
    const updateRes = await callDB(dbPool, { type: 'proc', call: 'update_user', params: { user_id, password_hash: new_hash } });
    if (updateRes.status === "failed") {
        sendResponse(res, { status: 'failed', error: 'userUpdateFailed' }, 404);
        return;
    }

    sendResponse(res, { status: "success" });
});

// Example protected route
router.get('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    res.json({
        message: 'Welcome!',
        user: (req as AuthenticatedRequest).user,
    });
});


//---------- Easy endpoints ----------//
const easyEndpoints: EasyEndpointMap = {
    //--------------- Users ---------------//
    'POST   /user/create':         ['func', 'create_user'],
    'GET    /user/all':            ['func', 'get_all_users', paramsToNumber()],
    'GET    /user/:user_id':       ['func', 'get_user_by_id', paramsToNumber()],
    'GET    /user/email/:email':   ['func', 'get_user_by_email'],
    'GET    /user/:user_id/teams': ['func', 'get_user_teams', paramsToNumber()],
    'PUT    /user/:user_id':       ['proc', 'update_user', paramsToNumber()],
    'DELETE /user/:user_id':       ['proc', 'delete_user', paramsToNumber()],

    //--------------- Teams ---------------//
    'POST   /team/create':            ['proc', 'create_team'],
    'GET    /team/all':               ['func', 'get_all_teams'],
    'GET    /team/:team_id':          ['func', 'get_team_by_id', paramsToNumber()],
    'PUT    /team/:team_id':          ['proc', 'update_team', paramsToNumber()],
    'DELETE /team/:team_id':          ['proc', 'delete_team', paramsToNumber()],

    //--------------- Membership ---------------//
    'POST   /team-membership/add':                         ['proc', 'add_team_member'],
    'GET    /team-membership/user/:user_id/team/:team_id': ['func', 'get_team_membership', paramsToNumber()],
    'GET    /team/:team_id/members':                       ['func', 'get_team_members', paramsToNumber()],
    'DELETE /team-membership/user/:user_id/team/:team_id': ['proc', 'remove_team_member', paramsToNumber()],

    //--------------- Statuses ---------------//
    'POST   /status/create':     ['proc', 'create_status'],
    'GET    /status/all':        ['func', 'get_all_statuses'],
    'GET    /status/:status_id': ['func', 'get_status_by_id', paramsToNumber()],
    'GET    /status/name/:name': ['func', 'get_status_by_name'],
    'PUT    /status/:status_id': ['proc', 'update_status', paramsToNumber()],
    'DELETE /status/:status_id': ['proc', 'delete_status', paramsToNumber()],

    //--------------- Todos ---------------//
    'POST   /todo/create':                       ['proc', 'create_todo'],
    'GET    /todo/:todo_id':                     ['func', 'get_todo_by_id', paramsToNumber()],
    'GET    /user/:user_id/todos':               ['func', 'get_user_todos', paramsToNumber()],
    'GET    /team/:team_id/user/:user_id/todos': ['func', 'get_member_todos', paramsToNumber()],
    'GET    /team/:team_id/todos':               ['func', 'get_team_todos', paramsToNumber()],
    'PUT    /todo/:todo_id':                     ['proc', 'update_todo', paramsToNumber()],
    'DELETE /todo/:todo_id':                     ['proc', 'delete_todo', paramsToNumber()],

    //--------------- Roles: Global ---------------//
    'POST   /global-role/create':                        ['proc', 'create_global_role'],
    'GET    /global-role/all':                           ['func', 'get_all_global_roles'],
    'GET    /global-role/:role_id':                      ['func', 'get_global_role_by_id', paramsToNumber()],
    'GET    /global-role/name/:name':                    ['func', 'get_global_role_by_name'],
    'PUT    /global-role/:role_id':                      ['proc', 'update_global_role', paramsToNumber()],
    'DELETE /global-role/:role_id':                      ['proc', 'delete_global_role', paramsToNumber()],
    'POST   /user/:user_id/global-role/:role_id/assign': ['proc', 'assign_global_role', paramsToNumber()],
    'GET    /user/:user_id/global-roles':                ['func', 'get_user_global_roles', paramsToNumber()],
    'DELETE /user/:user_id/global-role/:role_id/revoke': ['proc', 'revoke_global_role', paramsToNumber()],

    //--------------- Roles: Local ---------------//
    'POST   /local-role/create':                                     ['proc', 'create_local_role'],
    'GET    /local-role/all':                                        ['func', 'get_all_local_roles'],
    'GET    /local-role/:role_id':                                   ['func', 'get_local_role_by_id', paramsToNumber()],
    'GET    /local-role/name/:name':                                 ['func', 'get_local_role_by_name'],
    'PUT    /local-role/:role_id':                                   ['proc', 'update_local_role', paramsToNumber()],
    'DELETE /local-role/:role_id':                                   ['proc', 'delete_local_role', paramsToNumber()],
    'POST   /team-membership/:member_id/local-role/:role_id/assign': ['proc', 'assign_local_role', paramsToNumber()],
    'GET    /team-membership/:member_id/local-roles':                ['func', 'get_member_local_roles', paramsToNumber()],
    'DELETE /team-membership/:member_id/local-role/:role_id/revoke': ['proc', 'revoke_local_role', paramsToNumber()],
};

Object.entries(easyEndpoints).forEach(([id, [type, call, fmt]]) => {
    const [method, endpt] = id.split(/\s+/);
    router[method.toLowerCase() as Method](endpt, consReqHandler(type, call, fmt));
});

export default router;
