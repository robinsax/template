import { UserUpdateParams } from "@/model";
import { MutationContext, QueryContext } from "./base";
import { queryAuthState } from "./user";

const invalidateUserQueries = (context: MutationContext, userId: string) => {
    context.invalidate(queryAllUsers);
    context.invalidate(queryUserAudits, param => param.userId == userId);
};

export const queryAllUsers = async (context: QueryContext) => {
    context.dependOn(queryAuthState);

    return await context.api.users.get();
};

export const queryUserAudits = async (
    context: QueryContext,
    { userId }: { userId: string }
) => {
    context.dependOn(queryAuthState);

    return await context.api.users.id(userId).audits.get();
};

export const mutateUserActiveState = async (
    context: MutationContext,
    { userId, active }: { userId: string, active: boolean }
) => {
    await context.api.users.id(userId).activation.put({ active });

    invalidateUserQueries(context, userId);
};

export const mutateUserDetails = async (
    context: MutationContext,
    { userId, ...params }: UserUpdateParams & { userId: string }
) => {
    await context.api.users.id(userId).put(params);

    invalidateUserQueries(context, userId);
};
