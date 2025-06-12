import { z } from "zod";
import type { CallName, ParamValidator } from "./db.js";

export const z_str = z.string().max(2048);
export const z_str_nonempty = z_str.nonempty();
export const z_date = z.coerce.date();
export const z_timestamp = z.coerce.date().or(z.string());
export const z_id = z.number().int().nonnegative();
export const z_email = z_str.email();


export const z_str_opt = z_str.optional();
export const z_date_opt = z_date.optional();
export const z_timestamp_opt = z_timestamp.optional();
export const z_id_opt = z_id.optional();
export const z_email_opt = z_email.optional();

export function validatePassword(plaintext: string): boolean {
    return (
        plaintext.length < 512 &&
        plaintext.length > 8 &&
        /[a-z]/.test(plaintext) &&      // lowercase
        /[A-Z]/.test(plaintext) &&      // uppercase
        /[0-9]/.test(plaintext) &&      // digit
        /[^a-zA-Z0-9]/.test(plaintext)  // non-alphanumeric symbol
    );
}


export const VALIDATOR_SETS: { [key in CallName]: ParamValidator[] } = {
    //----- Functions -----//
    get_all_users:              [],
    get_user_by_email:          [["email", z_email]],
    get_user_by_id:             [["user_id", z_id]],
    get_user_teams:             [["user_id", z_id]],
    get_user_global_roles:      [["user_id", z_id]],
    get_user_todos:             [["user_id", z_id]],

    get_all_teams:              [],
    get_team_by_id:             [["team_id", z_id]],
    get_team_members:           [["team_id", z_id]],
    get_team_membership:        [["user_id", z_id], ["team_id", z_id]],
    get_team_todos:             [["team_id", z_id]],

    get_member_todos:             [["team_id", z_id], ["user_id", z_id]],
    get_todo_by_id:             [["todo_id", z_id]],

    get_member_local_roles:     [["member_id", z_id]],

    get_all_global_roles:       [],
    get_global_role_by_id:      [["role_id", z_id]],
    get_global_role_by_name:    [["name", z_str_nonempty]],
    get_all_local_roles:        [],
    get_local_role_by_id:       [["role_id",  z_id]],
    get_local_role_by_name:     [["name", z_str_nonempty]],
    get_all_statuses:           [],
    get_status_by_id:           [["status_id", z_id]],
    get_status_by_name:         [["name", z_str_nonempty]],



    //----- Procedures -----//
    add_team_member:            [["user_id", z_id], ["team_id", z_id]],
    assign_global_role:         [["user_id", z_id], ["role_id", z_id]],
    assign_local_role:          [["member_id", z_id], ["role_id", z_id]],

    create_global_role:         [["name", z_str_nonempty]],
    create_local_role:          [["name", z_str_nonempty]],
    create_status:              [["name", z_str_nonempty]],
    create_team:                [["name", z_str_nonempty], ["description", z_str]],
    create_todo: [
        ["team_id", z_id],
        ["title", z_str_nonempty],
        ["description", z_str],
        ["status", z_id],
        ["due_date", z_date_opt],
        ["assigned_to", z_id_opt]
    ],
    create_user: [
        ["name", z_str_nonempty],
        ["email", z_email],
        ["password_hash", z_str_nonempty],
        ["two_fa_secret", z_str_opt]
    ],

    get_user_secrets:           [["user_id", z_id]],
    get_user_secrets_by_email:  [["email", z_email]],

    delete_global_role:         [["role_id", z_id]],
    delete_local_role:          [["role_id", z_id]],
    delete_status:              [["status_id", z_id]],
    delete_team:                [["team_id", z_id]],
    delete_todo:                [["todo_id", z_id]],
    delete_user:                [["user_id", z_id]],

    remove_team_member:         [["user_id", z_id], ["team_id", z_id]],

    revoke_global_role:         [["user_id", z_id], ["role_id", z_id]],

    update_global_role:         [["role_id", z_id], ["name", z_str_nonempty]],
    update_local_role:          [["role_id", z_id], ["name", z_str_nonempty]],
    update_status:              [["status_id", z_id], ["name", z_str_nonempty]],

    revoke_local_role:          [["member_id", z_id], ["role_id", z_id]],

    update_team: [
        ["team_id", z_id],
        ["name", z_str_opt],
        ["description", z_str_opt]
    ],
    update_todo: [
        ["todo_id", z_id],
        ["assigned_to", z_id_opt],
        ["title", z_str_opt],
        ["description", z_str_opt],
        ["status", z_id_opt],
        ["due_date", z_date_opt],
        ["completed_at", z_timestamp_opt]
    ],
    update_user: [
        ["user_id", z_id],
        ["name", z_str_opt],
        ["email", z_email_opt],
        ["password_hash", z_str_opt],
        ["two_fa_secret", z_str_opt]
    ]
};