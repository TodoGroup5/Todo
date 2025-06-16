import { Pool } from 'pg';
import { type Request, type Response, Router } from 'express';
import { CallData, callDB, CallName, CallType, InvalidList, ParamValidator, parseParams, ParseParamsResult, TableResult, type JSONResult } from './db.js';
import { Repetitions } from './types.js';
import { validatePassword, z_email, z_id, z_str, z_str_nonempty, z_str_opt } from './callValidators.js';
import { AuthenticatedRequest, authenticateToken, comparePassHash, genJWT, hashPassword, JwtData, verifyJWT } from './auth.js';
import { isProductionEnvironment } from './lib/deployment.js';
import { JwtPayload, verify } from 'jsonwebtoken';
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

const _1hr = 60*60*1000;

// Write JWT to HttpOnly cookie
function setJWT(res: Response, user_id: number, email: string, maxAge: number = 24 * _1hr) {
    const token = genJWT(user_id, email);

    res.cookie('jwt', token, {
        httpOnly: true,
        secure: isProductionEnvironment(),  // requires HTTPS
        sameSite: 'strict',
        maxAge
    });
}

// Get JWT from cookie
function getJWT(req: Request): string | null {
    if (req.cookies == null || req.cookies.jwt == null) return null;
    return req.cookies.jwt;
}

function checkJWTAuth(req: Request): JwtData | null {
    const token = getJWT(req);
    if (!token) return null;
    return verifyJWT(token);
}

type ParamsDict<T = unknown> = { [key: string]: T };
type ParamFormatter<I = unknown, O = unknown> = (x: ParamsDict) => ParamsDict;

// Construct a request handler for easyEndpoints
function consReqHandler(type: CallType, call: CallName, urlParamFormatter: ParamFormatter = (x) => x) {
    return async (req: Request, res: Response) => {
        try {
            //----- Debug logs -----//
            console.log(`\n----- CALLING ${call} -----`)
            console.log('BODY:', req.body);
            console.log('PARAMS:', urlParamFormatter(req.params ?? {}));

            //----- Check JWT -----//
            const token = checkJWTAuth(req);
            if (token == null) {
                return sendResponse(res, { status: 'failed', error: 'invalidJWT' }, 401);
            }
            const { user_id } = token;

            //----- Return -----//
            return sendResponse(
                res,
                await callDB(dbPool, user_id, {
                    type,
                    call,
                    params: {
                        ...(req.body ?? {}),
                        ...urlParamFormatter(req.params ?? {}),
                    },
                })
            );
        } catch (err) { // Catch-all
            console.error(err);
            return sendResponse(res, { status: 'failed', error: 'internalServerError' }, 500);
        }
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
type Get_UserSecrets = { id: number; name: string; email: string; password_hash: string; two_fa_secret: string, two_fa_saved: boolean };
type Post_UserCreate = { user_id: number; };

function callSuccessWithData<S>(res: JSONResult<unknown[], unknown>): res is { status: 'success', data: { 0: S } & Array<S> } {
    return res.status === 'success' && res?.data != null && (res.data?.length ?? 0) !== 0;
}

router.post('/signup', async (req: Request, res: Response) => {
    //----- Validate request params -----//
    const expected: ParamValidator[] = [ ["name", z_str_nonempty], ["email", z_email], ["password", z_str_nonempty] ];
    const parseRes: ParseParamsResult = parseParams({ params: req.body }, expected);
    if (parseRes.status === 'failed') {
        return sendResponse(res, { status: 'failed', error: 'invalidParams', data: parseRes.invalid }, 400);
    }
    const [name, email, password] = parseRes.params as string[];

    //----- Check password complexity -----//
    if (!validatePassword(password)) {
        return sendResponse(res, { status: 'failed', error: 'passwordInsecure' }, 400);
    }
    
    //----- Create user -----//
    const password_hash = hashPassword(password);
    
    const createRes = await callDB(dbPool, -1, { type: 'func', call: 'create_user', params: { name, email, password_hash, two_fa_secret: "", two_fa_saved: false} });
    if(!callSuccessWithData<Post_UserCreate>(createRes)) {
        return sendResponse(res, { status: 'failed', error: 'userCreateFailed', data: createRes }, 400);
    }

    const { user_id } = createRes.data[0];
    //----- Return -----//
    return sendResponse(res, { status: 'success', data: { user_id } });
});

router.post('/signup/confirm', async (req: Request, res: Response) => {
    //----- Validate request params -----//
    const expected: ParamValidator[] = [ ["code", z_str_nonempty], ["user_id", z_id] ];
    const parseRes: ParseParamsResult = parseParams({ params: req.body }, expected);
    if (parseRes.status === 'failed') {
        return sendResponse(res, { status: 'failed', error: 'invalidParams', data: parseRes.invalid }, 400);
    }
    const [ code, user_id ] = parseRes.params as string[];

    const userRes = await callDB(dbPool, -1, { type: 'func', call: 'get_user_secrets', params: { user_id } });
    if (!callSuccessWithData<Get_UserSecrets>(userRes)) {
        return sendResponse(res, { status: 'failed', error: 'userNotFound' }, 404);
    }

    const { two_fa_secret, email } = userRes.data[0];

    //----- Verify the 2FA token -----//
    const verified = speakeasy.totp.verify({
        secret: two_fa_secret,
        encoding: 'base32',
        token: code,
        window: 2
    });
    
    if (!verified) {
        return sendResponse(res, { status: 'failed', error: 'incorrect 2fa code' }, 401);
    }

    //----- Return -----//
    return sendResponse(res, { status: 'success'});
});

router.post('/login', async (req: Request, res: Response) => {
    //----- Validate request params -----//
    const expected: ParamValidator[] = [["email", z_email], ["password", z_str_nonempty]];
    const parseRes: ParseParamsResult = parseParams({ params: req.body }, expected);
    if (parseRes.status === 'failed') {
        return sendResponse(res, { status: 'failed', error: 'invalidParams', data: parseRes.invalid }, 400);
    }

    //----- Get user secrets -----//
    const [email, password] = parseRes.params as string[];
    const userRes = await callDB(dbPool, -1, { type: 'func', call: 'get_user_secrets_by_email', params: { email } });
    if (!callSuccessWithData<Get_UserSecrets>(userRes)) {
        return sendResponse(res, { status: 'failed', error: 'userNotFound' }, 404);
    }
    const { name, id: user_id, password_hash, two_fa_secret, two_fa_saved } = userRes.data[0];

    //----- Handle first login - Display 2FA -----//
    let qrCodeUrl: string = "";
    if (two_fa_secret === "" || !two_fa_saved) {
        // Generate secret + QR
        const { base32: new_2fa_secret, otpauth_url } = speakeasy.generateSecret({
            name: `TodoApp-${name}`,
            issuer: 'TodoApp',
            length: 20
        });
        qrCodeUrl = await QRCode.toDataURL(otpauth_url!);

        //----- Update 2FA secret in the database -----//
        const update2faRes = await callDB(dbPool, -1, { type: 'proc', call: 'update_user', params: { user_id, two_fa_secret: new_2fa_secret, two_fa_saved: false } });
        if(update2faRes.status === "failed") {
            return sendResponse(res, { status: 'failed', error: 'update2faFailed', data: update2faRes }, 400);
        }
    }

    //----- Check hashes match -----//
    const isValid = comparePassHash(password, password_hash);
    if (!isValid) {
        return sendResponse(res, { status: 'failed', error: 'incorrectPassword' }, 401);
    }
    return sendResponse(res, { status: 'success', data: { user_id, qrCodeUrl } });
});


// Verify 2FA post-login
router.post('/login/verify', async (req: Request, res: Response) => {
    const expected: ParamValidator[] = [ ["code", z_str_nonempty], ["user_id", z_id] ];
    const parseRes: ParseParamsResult = parseParams({ params: req.body }, expected);
    if (parseRes.status === 'failed') {
        return sendResponse(res, { status: 'failed', error: 'invalidParams', data: parseRes.invalid }, 400);
    }
    const [ code, user_id ] = parseRes.params as string[];

    //----- Find user -----//
    const userRes = await callDB(dbPool, -1, { type: 'func', call: 'get_user_secrets', params: { user_id } });
    if (!callSuccessWithData<Get_UserSecrets>(userRes)) {
        return sendResponse(res, { status: 'failed', error: 'userNotFound' }, 404);
    }

    const { two_fa_secret, email, name } = userRes.data[0];
    // Verify the 2FA token
    const verified = speakeasy.totp.verify({
        secret: two_fa_secret,
        encoding: 'base32',
        token: code,
        window: 2
    });
    
    if (!verified) {
        return sendResponse(res, { status: 'failed', error: 'incorrect 2fa code' }, 401);
    }

    //----- Update 2FA secret in the database -----//
    const update2faRes = await callDB(dbPool, -1, { type: 'proc', call: 'update_user', params: { user_id, two_fa_saved: true } });
    if(update2faRes.status === "failed") {
        return sendResponse(res, { status: 'failed', error: 'update2faSavedFailed', data: update2faRes }, 400);
    }

    //----- Return -----//
    setJWT(res, parseInt(user_id), email);
    return sendResponse(res, { status: 'success', data: { user_id, name } });
});

router.post('/logout', async (req: Request, res: Response) => {
    res.clearCookie('jwt', {
        httpOnly: true,
        secure: isProductionEnvironment(),
        sameSite: 'strict',
    });
    res.status(200).json({ message: 'Logged out successfully' });
});



router.post('/change-password', async (req: Request, res: Response) => {
    //----- Check JWT -----//
    const token = checkJWTAuth(req);
    if (token == null) {
        return sendResponse(res, { status: 'failed', error: 'invalidJWT' }, 401);
    }
    const { user_id: jwt_user_id } = token;

    //----- Validate request params -----//
    const expected: ParamValidator[] = [ ['user_id', z_id], ['new_password', z_str_nonempty], ['old_password', z_str_nonempty] ];
    const parseRes: ParseParamsResult = parseParams({ params: req.body }, expected);
    if (parseRes.status === 'failed') {
        return sendResponse(res, { status: 'failed', error: 'invalidParams', data: parseRes.invalid }, 400);
    };
    const [ user_id, new_password, old_password ] = parseRes.params as string[];

    //----- Check password complexity -----//
    if (!validatePassword(new_password)) {
        return sendResponse(res, { status: 'failed', error: 'passwordInsecure' }, 400);
    }

    //----- Get user secrets -----//
    const userRes = await callDB(dbPool, jwt_user_id, { type: 'func', call: 'get_user_secrets', params: { user_id } });
    if (!callSuccessWithData<Get_UserSecrets>(userRes)) {
        return sendResponse(res, { status: 'failed', error: 'userNotFound' }, 404);
    }
    const { password_hash: old_hash } = userRes.data[0];

    //----- Check old password ----//
    if (!comparePassHash(old_password, old_hash)) {
        return sendResponse(res, { status: 'failed', error: 'incorrectPassword' }, 401);
    }

    //----- Hash new password ----//
    const new_hash = hashPassword(new_password);

    //----- Update user -----//
    const updateRes = await callDB(dbPool, jwt_user_id, { type: 'proc', call: 'update_user', params: { user_id, password_hash: new_hash } });
    if (updateRes.status === "failed") {
        return sendResponse(res, { status: 'failed', error: 'userUpdateFailed' }, 404);
    }

    return sendResponse(res, { status: "success" });
});

// Returns { isAuthenticated: true } if the user has a valid JWT
router.get('/auth', async (req: Request, res: Response) => {
    type AuthResponse = { isAuthenticated: boolean, username:string, roles: string[], user_id: number};
    try {
        //----- Check JWT -----//
        const token = checkJWTAuth(req);
        if (token == null) {
            return sendResponse(res, { status: 'failed', error: 'invalidJWT' }, 401);
        }
        const { user_id } = token;

        //find user
        const userRes = await callDB(dbPool, -1, { type: 'func', call: 'get_user_secrets', params: { user_id } });
        if (!callSuccessWithData<Get_UserSecrets>(userRes)) {
            return sendResponse(res, { status: 'failed', error: 'userNotFound' }, 404);
        }

        const { name } = userRes.data[0];

        return sendResponse<AuthResponse, AuthResponse>(res, { status: 'success', data: { isAuthenticated: (token != null), username: name, roles:[], user_id } }, 200);

    } catch (err) { // Catch-all
        console.error(err);
        return sendResponse(res, { status: 'failed', error: 'internalServerError' }, 500);
    }
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
    'POST   /team/create':            ['func', 'create_team'],
    'GET    /team/all':               ['func', 'get_all_teams'],
    'GET    /team/:team_id':          ['func', 'get_team_by_id', paramsToNumber()],
    'PUT    /team/:team_id':          ['proc', 'update_team', paramsToNumber()],
    'DELETE /team/:team_id':          ['proc', 'delete_team', paramsToNumber()],

    //--------------- Membership ---------------//
    'POST   /team-membership/add':                         ['func', 'add_user_to_team', paramsToNumber()],
    'GET    /team-membership/user/:user_id/team/:team_id': ['func', 'get_team_membership', paramsToNumber()],
    'GET    /team/:team_id/members':                       ['func', 'get_team_members', paramsToNumber()],
    'DELETE /team-membership/:member_id': ['proc', 'remove_user_from_team', paramsToNumber()],

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
