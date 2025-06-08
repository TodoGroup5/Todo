import type { Pool, Client, QueryResult, QueryResultRow, FieldDef } from 'pg';
import type { ZodType } from 'zod';
import { VALIDATOR_SETS } from './callValidators.js';


//---------- Types ----------//
// For raw DB interactions via callProcRaw()
export type RawParams = (string | number | boolean | Date | null)[];
export type RawResult<T extends QueryResultRow> = QueryResult<T>;

// Either (success + data)/(failure + error)
export type JSONResult<S = undefined, F = undefined> = (
  { status: 'success'; data?: S; } |
  { status: 'failed'; error: string; data?: F }
);

export type CallName =
  "add_team_member" | "assign_global_role" | "assign_local_role" |
  "create_global_role" | "create_local_role" | "create_status" | "create_team" | "create_todo" | "create_user" |
  "delete_global_role" | "delete_local_role" | "delete_status" | "delete_team" | "delete_todo" | "delete_user" |
  "get_global_role_by_id" | "get_global_role_by_name" | "get_local_role_by_id" | "get_local_role_by_name" | "get_member_local_roles" |
  "get_status_by_id" | "get_status_by_name" | "get_team_by_id" | "get_team_members" | "get_team_membership" |
  "get_team_todos" | "get_todo_by_id" | "get_user_by_email" | "get_user_by_id" | "get_user_global_roles" |
  "remove_team_member" | "revoke_global_role" | "revoke_local_role" |
  "update_global_role" | "update_local_role" | "update_status" | "update_team" | "update_todo" | "update_user";

// API-side interface for calling DB procs
export type ParamName = string;
export type CallType = "func" | "proc";
export type CallData = {
  call: CallName;
  params: { [key: ParamName]: unknown };
} & (
  { type: "proc" } |
  { type: "func", page?: number, itemsPerPage?: number }
);

// For parsing & validation of API calls into raw DB proc params via parseParams()
export type ParamValidator = string | [string, ZodType] | [string, (x: any) => boolean];
export type InvalidList = [string, string][];
export type ParseParamsResult = (
  { status: 'success'; params: RawParams } |
  { status: 'failed'; invalid: InvalidList }
);

export type TableResult = { [key: string]: unknown }[];

function isZodType(x: any): x is ZodType {
  return (typeof x?.safeParse === 'function');
}


//---------- Utils ----------//

// Parse ProcCallData->params into a ParseParamsResult
export function parseParams(
  call: CallData,
  expected: ParamValidator[]
): ParseParamsResult {
  const res: any[] = [];
  const invalid: [string, string][] = [];

  for (const exp of expected) {
    let paramName: string;
    let validator: ZodType | ((x: any) => boolean) | undefined;

    [paramName, validator] = (typeof exp === 'string') ? [exp, undefined] : exp;

    // Check missing param
    // REMOVED: Handled by VALIDATOR_SETS
    // if (!(paramName in call.params)) {
    //   invalid.push([paramName, 'Missing parameter']);
    //   continue;
    // }

    const value = call.params[paramName] ?? undefined;
    
    // Skip missing validator
    if (!validator) { res.push(value); continue; }

    if (isZodType(validator)) {                           // Zod validator
      const result = validator.safeParse(value);
      if (!result.success) {
        invalid.push([paramName, result.error.errors.map(x => `[${x.code}]`).join(", ")]);
        continue;
      }
      res.push(result.data);
    }
    else if (typeof validator === 'function') {         // Lambda validator
      if (!validator(value)) {
        invalid.push([paramName, 'Failed custom validation']);
        continue;
      }
      res.push(value);
    }
  }

  if (invalid.length > 0) {
    return { status: 'failed', invalid };
  }

  return { status: 'success', params: res };
}

// Safely execute an arbitrary PostgreSQL func/proc with sanitization & injection
export async function callDBRaw<T extends QueryResultRow>(
  pool: Pool | Client,              // Postgres connection pool
  callName: string,
  params: RawParams = [],
  callType: CallType = "func",
  page: number = 0,                 // ignored for procs
  itemsPerPage: number = 100        // ignored for procs
): Promise<RawResult<T> | null> {
  try {
    const query = (callType === "proc")
    ? `CALL ${callName}(${params.map((_, i) => `$${i + 1}`).join(', ')});` // E.g. CALL create_user($1, $2, $3);
    : `
      SELECT * FROM ${callName}($${params.map((_, i) => i + 1).join(', ')})
      LIMIT ${Number(itemsPerPage) || 0} OFFSET ${Number(page * itemsPerPage) || 0};
    `;

    const result = await pool.query<T>(query, params);
    return result;
  } catch (error: any) {
    console.error(`Error executing ${callName}(...):`, error);
    throw error;
  }
}

// Wrapper for callRaw hiding DB-side types, extracting API call params & performing validation
// On success, returns rows[] TableResult
// On failure, returns [paramName, error][] InvalidList
export async function callDB (
  pool: Pool | Client,
  call: CallData,
  expected: ParamValidator[] = VALIDATOR_SETS[call.call]
): Promise<JSONResult<TableResult, InvalidList>> {

  // Parse into raw params
  const rawParams = parseParams(call, expected);

  if (rawParams.status === 'failed') {
    return { status: 'failed', error: 'invalidParams', data: rawParams.invalid };
  }

  // Attempt DB call
  try {
    const res = await callDBRaw(pool, call.call, rawParams.params, call.type, (call as any).page ?? undefined, (call as any).itemsPerPage ?? undefined);
    return { status: 'success', data: res?.rows ?? [] };
  }
  catch (error: any) {
    return { status: 'failed', error: 'dbCallFailed', data: error.message };
  }
}