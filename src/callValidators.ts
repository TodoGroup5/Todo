import { z } from "zod";
import type { CallName, ParamValidator } from "./db.ts";

const str = z.string().max(2048);
const date = z.date();
const timestamp = z.date().or(z.string());
const id = z.number().int().nonnegative();
const email = str.email();


const str_opt = str.optional();
const date_opt = date.optional();
const timestamp_opt = timestamp.optional();
const id_opt = id.optional();
const email_opt = email.optional();



export const VALIDATOR_SETS: { [key in CallName]: ParamValidator[] } = {
    //----- Functions -----//
    get_user_by_email:          [["email", email]],
    get_user_by_id:             [["user_id", id]],
    get_user_global_roles:      [["user_id", id]],

    get_team_by_id:             [["team_id", id]],
    get_team_members:           [["team_id", id]],
    get_team_membership:        [["user_id", id], ["team_id", id]],
    get_team_todos:             [["team_id", id]],

    get_todo_by_id:             [["todo_id", id]],

    get_member_local_roles:     [["member_id", id]],

    get_global_role_by_id:      [["role_id", id]],
    get_global_role_by_name:    [["name", str]],
    get_local_role_by_id:       [["role_id",  id]],
    get_local_role_by_name:     [["name", str]],
    get_status_by_id:           [["status_id", id]],
    get_status_by_name:         [["name", str]],



    //----- Procedures -----//
    add_team_member:            [["user_id", id], ["team_id", id]],
    assign_global_role:         [["user_id", id], ["role_id", id]],
    assign_local_role:          [["member_id", id], ["role_id", id]],

    create_global_role:         [["name", str]],
    create_local_role:          [["name", str]],
    create_status:              [["name", str]],
    create_team:                [["name", str], ["description", str]],
    create_todo: [
        ["created_by", id],
        ["team_id", id],
        ["title", str],
        ["description", str],
        ["status", id],
        ["assigned_to", id_opt],
        ["due_date", date_opt]
    ],
    create_user: [
        ["name", str],
        ["email", email],
        ["password_hash", str],
        ["two_fa_secret", str_opt]
    ],

    delete_global_role:         [["role_id", id]],
    delete_local_role:          [["role_id", id]],
    delete_status:              [["status_id", id]],
    delete_team:                [["team_id", id]],
    delete_todo:                [["todo_id", id]],
    delete_user:                [["user_id", id]],

    remove_team_member:         [["user_id", id], ["team_id", id]],

    revoke_global_role:         [["user_id", id], ["role_id", id]],

    update_global_role:         [["role_id", id], ["name", str]],
    update_local_role:          [["role_id", id], ["name", str]],
    update_status:              [["status_id", id], ["name", str]],

    revoke_local_role:          [["member_id", id], ["role_id", id]],

    update_team: [
        ["team_id", id],
        ["name", str_opt],
        ["description", str_opt]
    ],
    update_todo: [
        ["todo_id", id],
        ["assigned_to", id_opt],
        ["title", str_opt],
        ["description", str_opt],
        ["status", id_opt],
        ["due_date", date_opt],
        ["completed_at", timestamp_opt]
    ],
    update_user: [
        ["user_id", id],
        ["name", str_opt],
        ["email", email_opt],
        ["password_hash", str_opt],
        ["two_fa_secret", str_opt]
    ]
};