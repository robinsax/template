/** This file is auto-generated. Do not modify it. */
/* eslint-disable max-len */
import { UserModel, UserCreateParams, UserConfirmParams, UserPasswordUpdateParams, UserUpdateParams, NotificationModel, NotificationsUpdateParams, AuthParams, AuthResp, AuthKeyModel, PasswordResetRequestParams, UploadModel } from "@/models";

import { APIClientBase, APICallOptions } from "./base";

export const binding = (api: APIClientBase) => ({
    health: {
        get: (options?: APICallOptions): Promise<void> => (api.call({ path: `/health`, method: "get" }, options))    
    },
    users: {
        get: (options?: APICallOptions): Promise<UserModel[]> => (api.call({ path: `/users`, method: "get" }, options)),
        id: (user_id: string) => (({
            get: (options?: APICallOptions): Promise<UserModel> => (api.call({ path: `/users/${user_id}`, method: "get" }, options)),
            password: {
                put: (body: UserPasswordUpdateParams, options?: APICallOptions): Promise<UserModel> => (api.call({ path: `/users/${user_id}/password`, method: "put", body }, options))            
            },
            put: (body: UserUpdateParams, options?: APICallOptions): Promise<UserModel> => (api.call({ path: `/users/${user_id}`, method: "put", body }, options)),
            notifications: {
                get: (options?: APICallOptions): Promise<NotificationModel[]> => (api.call({ path: `/users/${user_id}/notifications`, method: "get" }, options)),
                put: (body: NotificationsUpdateParams, options?: APICallOptions): Promise<void> => (api.call({ path: `/users/${user_id}/notifications`, method: "put", body }, options))            
            }        
        })),
        post: (body: UserCreateParams, options?: APICallOptions): Promise<UserModel> => (api.call({ path: `/users`, method: "post", body }, options)),
        confirmations: {
            post: (body: UserConfirmParams, options?: APICallOptions): Promise<UserModel> => (api.call({ path: `/users/confirmations`, method: "post", body }, options))        
        }    
    },
    auth: {
        post: (body: AuthParams, options?: APICallOptions): Promise<AuthResp> => (api.call({ path: `/auth`, method: "post", body }, options)),
        put: (options?: APICallOptions): Promise<AuthKeyModel> => (api.call({ path: `/auth`, method: "put" }, options)),
        delete: (options?: APICallOptions): Promise<AuthKeyModel> => (api.call({ path: `/auth`, method: "delete" }, options)),
        passwordResets: {
            post: (body: PasswordResetRequestParams, options?: APICallOptions): Promise<void> => (api.call({ path: `/auth/password-resets`, method: "post", body }, options))        
        }    
    },
    uploads: {
        type: (upload_type: string) => (({
            id: (upload_id: string) => (({
                get: (options?: APICallOptions): Promise<Response> => (api.call({ path: `/uploads/${upload_type}/${upload_id}`, method: "get" }, { ...options, rawResp: true }))            
            })),
            post: (body: File, options?: APICallOptions): Promise<UploadModel> => (api.call({ path: `/uploads/${upload_type}`, method: "post", body }, options))        
        }))    
    }
});
