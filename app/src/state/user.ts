import { UserCreateParams, AuthParams, UserModel, UserPasswordSetParams } from "@/model";

import { MutationContext, QueryContext } from "./base";
import { queryLocalSettings } from "./local";

export type StoredAuthState = {
    token: string,
    userId: string
};

export const queryAuthState = (): StoredAuthState | null => {
    if (!localStorage.getItem("authState")) return null;

    return JSON.parse(localStorage.getItem("authState") as string);
};

export const mutateAuthState = (
    context: MutationContext, newState: StoredAuthState | null
) => {
    if (newState) {
        localStorage.setItem("authState", JSON.stringify(newState));
    } else {
        localStorage.removeItem("authState");
    }

    context.invalidate(queryAuthState);
};

export const queryCurrentUser = async (
    context: QueryContext
): Promise<UserModel | null> => {
    const authState = await context.query(queryAuthState);
    if (!authState) return null;

    return await context.api.users.id(authState.userId).get();
};

export const mutateLogIn = async (
    context: MutationContext, creds: Omit<AuthParams, "restriction">
) => {
    const resp = await context.api.auth.post({
        ...creds,
        restriction: null
    });

    mutateAuthState(context, {
        token: resp.token,
        userId: resp.auth.user_id
    });
};

export const mutateLogOut = async (context: MutationContext) => {
    await context.api.auth.delete();

    mutateAuthState(context, null);
};

export const mutateCreateUser = async (
    context: MutationContext, create: Omit<UserCreateParams, "locale">
) => {
    const settings = await context.query(queryLocalSettings);

    await context.api.users.post({
        ...create,
        locale: settings.locale
    });
};

export const mutateRequestPasswordReset = async (
    context: MutationContext, { email }: { email: string }
) => {
    await context.api.auth.passwordResets.post({ email });
};

export const mutateResetPassword = async (
    context: MutationContext, { userId, token, password }: UserPasswordSetParams & {
        userId: string
    }
) => {
    await context.api.users.id(userId).password.put({ token, password });
};

export const mutateConfirmUserAndLogIn = async (
    context: MutationContext, { token, password }: UserPasswordSetParams
) => {
    const user = await context.api.users.confirmations.post({ token, password });

    await mutateLogIn(context, { email: user.email, password });
};

export const queryNotifications = async (context: QueryContext, { includeSeen }: {
    includeSeen: boolean
}) => {
    const user = await context.query(queryCurrentUser);
    if (!user) return [];

    return await context.api.users.id(user.id).notifications.get({
        query: { include_seen: includeSeen + "" }
    });
};

export const mutateClearNotifications = async (context: MutationContext, { ids }: {
    ids: string[]
}) => {
    const user = await context.query(queryCurrentUser);
    if (!user) throw new Error("No user");

    await context.api.users.id(user.id).notifications.put({
        seen_ids: ids
    });

    context.invalidate(queryNotifications);
};
