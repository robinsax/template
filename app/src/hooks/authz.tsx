/**
*   Authorization state hooks and contexts. 
*/
import React, { ReactNode, createContext, useContext, useMemo } from 'react';

import { Permission, AuthzScope, permissionsMatrix, UserModel } from '@/models';
import { grantContainsScope, isUserWithinManageScopeOf } from '@/util';

import { useCurrentUser } from './auth';

const DEFAULT_AUTHZ_SCOPE: AuthzScope = {
    clientId: null,
    businessId: null
};

const authzScopeContext = createContext<AuthzScope>(DEFAULT_AUTHZ_SCOPE);

/**
*   Provides an authorization scope against which {@link useAuthzCheck} compares.
*
*   The provided scope will inherit values not explicitly passed as props from the scope
*   mounted above it.
*/
export const AuthzScopeProvider = ({ children, clientId, businessId }: {
    children: ReactNode,
    clientId?: string | null,
    businessId?: string | null
}) => {
    const parentScope = useAuthzScope();

    const scope = useMemo(() => ({
        clientId: clientId === undefined ? parentScope.clientId : clientId,
        businessId: businessId === undefined ? parentScope.businessId : businessId
    }), [clientId, businessId]);

    return (
        <authzScopeContext.Provider value={ scope }>
            { children }
        </authzScopeContext.Provider>
    );
};

/**
*   Returns the current {@link AuthzScope} at the caller's mount point.
*/
export const useAuthzScope = () => useContext(authzScopeContext);

/**
*   Return whether the current user has the given permission within the authorization
*   scope at the caller's mount point.
* 
*   If multiple permissions are specified, returns whether the current user has any of
*   them.
*
*   If `permission` is `null`, return `true`.
*/
export const useAuthzCheck = (
    permission: Permission | Permission[] | null,
    opts: {
        scope?: AuthzScope,
        scopeless?: boolean,
        anyClientInnerScope?: boolean
    } = {}
) => {
    const user = useCurrentUser();

    const contextScope = useAuthzScope();

    return useMemo(() => {
        if (!user) return false;

        if (permission == null) return true;

        const checkPermissions = (
            permission instanceof Array ? permission : [permission]
        );

        const authzScope = opts.scope ? opts.scope : contextScope;

        for (const grant of user.grants) {
            const permissions = permissionsMatrix[grant.role];

            let matchesAny = false;
            for (const permission of checkPermissions) {
                if (!permission) continue;
                if (!permissions[permission]) continue;

                matchesAny = true;
            }
            if (!matchesAny) continue;

            if (opts.scopeless) return true;

            const allowedWithinClient = (
                opts.anyClientInnerScope && grant.client_id == authzScope.clientId
            );
            if (allowedWithinClient) return true;

            if (grantContainsScope(grant, authzScope)) return true;
        }

        return false;
    }, [user, permission, contextScope, opts]);
};

/**
*   Return whether the current user has IAM permission on the given `targetUser` within
*   the authorization scope at the caller's mount point.
*/
export const useUserManageAuthzCheck = (targetUser: UserModel) => {
    const user = useCurrentUser();

    return useMemo(() => {
        if (!user) return false;

        return isUserWithinManageScopeOf(targetUser, user);
    }, [user, targetUser]);
};
