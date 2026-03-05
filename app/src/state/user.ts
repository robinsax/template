import { MutationContext, QueryContext } from "./base";
import { queryAuthState } from "./local";

export const queryCurrentUser = async (
    context: QueryContext
) => {
    const authState = await context.query(queryAuthState);
    if (!authState) return null;

    const user = context.api.users.id(authState.userId).get();
    return user;
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
