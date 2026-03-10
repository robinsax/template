/**
*   Authorization state hooks and contexts. 
*/
import { useMemo } from "react";

import { Permission, permissionsMatrix, RealmModel } from "@/model";
import { queryCurrentUser } from "@/state";

import { useQuery } from "./state";

/**
*   Return whether the current user has the given permission within the given realm.
* 
*   If multiple permissions are specified, returns whether the current user has any of
*   them.
*
*   If `permission` is `null`, return `true`.
*/
export const useAuthzCheck = (
    realm: RealmModel | null,
    permission: Permission | Permission[] | null,
    { scopeless = false }: { scopeless?: boolean } = {}
) => {
    const [user] = useQuery(queryCurrentUser);

    return useMemo(() => {
        if (!permission && !realm) return true;
        if (!user) return false;

        const checkPermissions = (
            permission instanceof Array ? permission : [permission]
        );

        for (const role of user.roles) {
            const permissions = permissionsMatrix[role.role];

            let matchesAny = false;
            for (const permission of checkPermissions) {
                if (!permission) continue;
                if (!permissions[permission]) continue;

                matchesAny = true;
                break;
            }
            if (!matchesAny) continue;

            // Scopeless check or global role.
            if (scopeless || !role.realm) return true;

            // Check for parent of requested realm that role is applied at.
            let current: RealmModel | null = realm;
            while (current) {
                if (current.id == role.realm.id) return true;

                current = current.parent;
            }
        }

        return false;
    }, [user, permission, realm]);
};
