/** This file is auto-generated. Do not modify it. */
/* eslint-disable max-len */
export type AuditModel = {
    id: string,
    user: UserModel,
    target_type: string,
    target_id: string,
    occurred_at: Date,
    event: string,
    params: (Record<string, unknown> | null)
};

export type AuditStandaloneModel = {
    id: string,
    user: UserModel,
    occurred_at: Date,
    event: string,
    target_type: string,
    target_summary: unknown
};

export type AuditSummaryModel = {
    created_by: (UserModel | string),
    created_at: Date,
    last_updated_at: Date,
    last_updated_by: (UserModel | string)
};

export type AuthKeyModel = {
    user_id: string,
    created_at: Date,
    expires_at: Date,
    revoked_at: (Date | null),
    restriction: (AuthKeyRestriction | null)
};

export type AuthKeyRestriction = ("email_confirm" | "password_reset");

export const authKeyRestrictions: AuthKeyRestriction[] = ["email_confirm", "password_reset"];

export type BasicAuditEvent = ("create" | "update" | "delete");

export const basicAuditEvents: BasicAuditEvent[] = ["create", "update", "delete"];

export type NotificationEmailStatus = ("pending" | "skipped" | "error" | "sent");

export const notificationEmailStatuses: NotificationEmailStatus[] = ["pending", "skipped", "error", "sent"];

export type NotificationModel = {
    id: string,
    cause_user_id: string,
    occurred_at: Date,
    seen_at: (Date | null),
    type: NotificationType,
    cause_user: (UserModel | null),
    target_type: (string | null),
    target_id: (string | null),
    cosmetic_metadata: (Record<string, string> | null)
};

export type NotificationType = ("confirm_email" | "password_reset");

export const notificationTypes: NotificationType[] = ["confirm_email", "password_reset"];

export type Permission = ("iam");

export const permissions: Permission[] = ["iam"];

export type RealmModel = {
    id: string,
    type: RealmType,
    name: string,
    parent: (RealmModel | null)
};

export type RealmType = ("instance");

export const realmTypes: RealmType[] = ["instance"];

export type Role = ("admin" | "user");

export const roles: Role[] = ["admin", "user"];

export type UploadModel = {
    id: string,
    type: UploadType,
    realm_id: string,
    filename: string,
    content_type: string,
    size: number
};

export type UploadType = ("default");

export const uploadTypes: UploadType[] = ["default"];

export type UserModel = {
    id: string,
    name: string,
    email: string,
    roles: UserRoleModel[],
    locale: string
};

export type UserRoleModel = {
    id: string,
    user_id: string,
    realm: (RealmModel | null),
    role: Role
};

export type AuthParams = {
    email: (string | null),
    password: (string | null),
    restriction: (AuthKeyRestriction | null)
};

export type AuthResp = {
    token: string,
    auth: AuthKeyModel
};

export type AuthWSParams = {
    token: string
};

export type NotificationsUpdateParams = {
    seen_ids: string[]
};

export type PasswordResetRequestParams = {
    email: string
};

export type UserConfirmParams = {
    confirm_token: string,
    password: string
};

export type UserCreateParams = {
    name: string,
    email: string,
    locale: string
};

export type UserPasswordUpdateParams = {
    reset_token: string,
    password: string
};

export type UserUpdateParams = {
    name: (string | null),
    locale: (string | null),
    avatar_id: (string | null)
};

export const permissionsMatrix: Record<Role, Partial<Record<Permission, boolean>>> = {
    admin: {
        iam: true    
    },
    user: {
    
    }
};

export const roleScopes: Record<Role, (RealmType | null)[]> = {
    admin: [null],
    user: [null]
};
