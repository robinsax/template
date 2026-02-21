/**
*   Grant control UI.
*/
import React, { useEffect, useMemo, useState } from 'react';
import { VStack, HStack, Button, Alert, Box, Spinner, Text } from '@chakra-ui/react';
import { Select, SelectButton, SelectList } from '@saas-ui/react';

import { AuthzScope, UserModel, Role, UserGrantModel } from '@/models';
import { grantContainsScope } from '@/util';
import {
    APIClient, useAsyncCallback, useI18n, useAPI, useInvalidate, useAuthzScope,
    useFetchedState,
} from '@/hooks';
import { UserPersona, RoleSummary, roleTitle } from '@/components/users';

/**
*   Returns the API endpoints for grant control at the given scope.
*/
export const grantsEndpointsForScope = (api: APIClient, scope: AuthzScope) => {
    return (
        !scope.clientId ?
            api.global
        : scope.businessId ?
            api.clients.id(scope.clientId).businesses.id(scope.businessId)
        :
            api.clients.id(scope.clientId)
    );
};

/**
*   Grant control component for assigning grants to the given user.
*/
export const GrantControl = ({ user, authzScope: authzScopeProp, onDone }: {
    user: UserModel,
    authzScope?: AuthzScope,
    onDone: () => void
}) => {
    const t = useI18n();
    const api = useAPI();

    const invalidate = useInvalidate();

    const authzScope = authzScopeProp || useAuthzScope();

    // Find grant exactly at this level.
    const currentRole = useMemo(() => {
        for (const grant of user.grants) {
            const matches = (
                grant.client_id == authzScope.clientId &&
                grant.business_id == authzScope.businessId
            );
            if (matches) return grant.role;
        }
    }, [user]);

    // Find grants above (but not at) this level.
    const parentGrants = useMemo(() => {
        const grants: UserGrantModel[] = [];
        for (const grant of user.grants) {
            const parent = (
                (
                    grant.client_id != authzScope.clientId ||
                    grant.business_id != authzScope.businessId
                ) &&
                grantContainsScope(grant, authzScope)
            );
            if (parent) grants.push(grant);
        }

        return grants;
    }, [user]);

    // Fetch role options.
    const [roleOptions, _, roleOptionsError] = useFetchedState(async api => {
        const endpoint = grantsEndpointsForScope(api, authzScope);

        return await endpoint.users.id(user.id).roleOptions.get();
    });

    const [role, setRole] = useState<Role | null>(currentRole || null);

    // Set initial role if none selected.
    useEffect(() => {
        if (currentRole) return;
        if (!roleOptions || !roleOptions.length) return;

        setRole(roleOptions[0]);
    }, [currentRole, roleOptions]);

    // Submit callback.
    const [onSelect, working] = useAsyncCallback(async (role: Role) => {
        if (!user || !role) return;

        const endpoint = grantsEndpointsForScope(api, authzScope);

        await endpoint.users.id(user.id).put({ role });

        invalidate({
            queryKeys: ['users', 'clients']
        });
        onDone();
    }, [user, authzScope.clientId]);

    const roleSelectOptions = useMemo(() => {
        if (!roleOptions) return [];

        return roleOptions.map(role => ({
            label: roleTitle(t, role),
            value: role
        }));
    }, [roleOptions]);

    return (
        <VStack width="full" spacing={ 6 }>
            { roleOptionsError ? (
                <Alert status="error">
                    { roleOptionsError == 'invalid_target' ?
                        // eslint-disable-next-line max-len
                        t('Roles cannot be assigned to this organization. Either it is deactivated or does not exist.')
                    :
                        t('Failed to gather role options.')
                    }
                </Alert>
            ) : !roleOptions ? (
                <Spinner/>
            ) : (
                <>
                    { parentGrants.length > 0 && (
                        <Alert status="warning">
                            { t('{name} is {roles} above this level.', {
                                name: user.name,
                                roles: parentGrants.map(grant => (
                                    roleTitle(t, grant.role)
                                )).join(', ')
                            }) }
                        </Alert>
                    ) }
                    { currentRole && (
                        <Alert>
                            { t('{role} is {name}\'s current role.', {
                                name: user.name,
                                role: roleTitle(t, currentRole)
                            }) }
                        </Alert>
                    ) }
                    { !roleOptions.length ? (
                        <Alert status="error">
                            <VStack alignItems="left">
                                <Text size="sm">
                                    { t('No roles available.') }
                                </Text>
                                <Text>{ 
                                    // eslint-disable-next-line max-len
                                    t('Either {user} already has a role that makes any roles at this level redundant, or there are no roles assignable at this level for this type of user.', {
                                        user: user.name
                                    })
                                }</Text>
                            </VStack>
                        </Alert>
                    ) : (
                        <>
                            <HStack width="full" alignItems="left" spacing={ 4 }>
                                <Box width="260px">
                                    <UserPersona withType for={ user }/>
                                </Box>
                                <Box width="full" alignSelf="center">
                                    <Select
                                        name="role"
                                        options={ roleSelectOptions }
                                        defaultValue={ currentRole || roleOptions[0] }
                                        onChange={ value => setRole(value as Role) }
                                    >
                                        <SelectButton/>
                                        <SelectList/>
                                    </Select>
                                </Box>
                            </HStack>
                            { role && (
                                <>
                                    <RoleSummary role={ role }/>
                                    <Button
                                        width="full"
                                        onClick={ () => onSelect(role) }
                                        isLoading={ working }
                                    >
                                        { t('Grant Role') }
                                    </Button>
                                </>
                            ) }
                        </>
                    ) }
                </>
            ) }
        </VStack>
    );
};
