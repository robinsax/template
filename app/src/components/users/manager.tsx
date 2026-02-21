/**
*   User management UI. 
*/
import React, { ReactNode, useMemo, useCallback } from 'react';
import {
    VStack, Box, Text, HStack, Badge, Spacer, Flex, Tooltip, Popover, PopoverTrigger,
    PopoverContent, PopoverBody, PopoverArrow, Portal, Alert, Heading
} from '@chakra-ui/react';

import { AuthzScope, UserGrantModel, UserModel } from '@/models';
import { mergeCallbacks } from '@/util';
import {
    I18nValueFn, useAuthzCheck, useAsyncCallback, useI18n, useAPI, useInvalidate,
    useCurrentUser, useUserManageAuthzCheck
} from '@/hooks';
import { OrganizationPersona } from '@/components/organizations';
import {
    ManagerLayout, ModalButton, ClickTarget, Icon, ActiveStateToggleButton,
    StateBadge, ActionIcon, BlockCard, Sidebar, useListSystem, useSidebarControl
} from '@/components/common';

import { UserPersona } from './personas';
import { UserEditForm, UserInviteForm } from './forms';
import { roleTitle, userTypeTitle } from './authz';
import { GrantControl, grantsEndpointsForScope } from './grant-control';

/**
*   Canonical user list system.
*/
export const useUserList = () => {
    return useListSystem<UserModel>({
        keyFields: (user, t) => [
            user.name, user.email,
            userTypeTitle(t, user.type),
            ...user.grants.map(grant => ([
                roleTitle(t, grant.role),
                grant.client ? grant.client.name : null,
                grant.business ? grant.business.name : null
            ].filter(Boolean) as string[])).flat()
        ],
        emptyLabel: t => t('No users found.')
    });
};

/**
*   User invite form with explanatory UI.
*/
export const UserInvite = ({ onInvited, children }: {
    onInvited: (user: UserModel) => void,
    children?: ReactNode
}) => {
    const t = useI18n();

    return (
        <VStack width="full" spacing={ 4 }>
            <Alert status="info">
                { t('This person will be invited via email.') }
            </Alert>
            <Box width="full">
                <UserInviteForm onInvited={ onInvited }/>
            </Box>
            { children && (
                <Box width="full">
                    { children }
                </Box>
            ) }
        </VStack>
    );
};

/**
*   Modalized flow to invite a user.
*/
export const UserInviteButton = ({ onInvited }: {
    onInvited: (user: UserModel) => void
}) => {
    return (
        <ModalButton
            variant="ghost"
            leftIcon={ <Icon name="add"/> }
            label={ t => t('Invite someone') }
        >
            { onClose => (
                <UserInvite onInvited={ mergeCallbacks(onInvited, onClose) }/>
            ) }
        </ModalButton>
    );
};

/**
*   Modalized flow to edit user metadata.
*/
export const UserEditButton = ({ user, label }: {
    user: UserModel,
    label?: I18nValueFn
}) => {
    return (
        <ModalButton
            variant="ghost"
            leftIcon={ <Icon name="edit"/> }
            label={ t => label ? label(t) : t('Edit User') }
            modalSize="lg"
        >
            { onClose => (
                <UserEditForm user={ user } onDone={ onClose }/>
            ) }
        </ModalButton>
    );
};

/**
*   Modalized flow to change a user's role at the given `grant`s scope.
*/
export const UserGrantChangeButton = ({ user, grant }: {
    user: UserModel,
    grant: UserGrantModel
}) => {
    return (
        <ModalButton
            variant="ghost"
            iconName="switch"
            tooltip={ t => t('Change role') }
        >
            { onClose => (
                <GrantControl
                    user={ user }
                    authzScope={ {
                        clientId: grant.client_id,
                        businessId: grant.business_id
                    } }
                    onDone={ onClose }
                />
            ) }
        </ModalButton>
    );
};

/**
*   UI to create a platform-level grant for the given user.
*/
export const AddPlatformGrantToUser = ({ user, onDone }: {
    user: UserModel,
    onDone: () => void
}) => {
    const t = useI18n();

    return (
        <VStack width="full" alignItems="left" spacing={ 6 }>
            <HStack width="full">
                <Heading size="sm">
                    { t('Adding platform role for') }
                </Heading>
                <UserPersona for={ user } size="xs"/>
            </HStack>
            <GrantControl
                user={ user }
                authzScope={ { clientId: null, businessId: null } }
                onDone={ onDone }
            />
        </VStack>
    );
};

/**
*   List item for a user grant allowing management.
*/
export const UserGrantListItem = ({ user, grant }: {
    user: UserModel,
    grant: UserGrantModel
}) => {
    const t = useI18n();

    const api = useAPI();
    const currentUser = useCurrentUser();
    const invalidate = useInvalidate();

    const authzScope = useMemo<AuthzScope>(() => {
        return {
            clientId: grant.client_id,
            businessId: grant.business_id
        };
    }, [grant.client_id, grant.business_id]);

    const manageAllowed = useAuthzCheck('manage_iam', {
        scope: authzScope
    });

    const [onRevoke, revokeWorking] = useAsyncCallback(async () => {
        const endpoint = grantsEndpointsForScope(api, authzScope);

        await endpoint.users.id(grant.user_id).delete();

        invalidate({
            queryKeys: ['users', 'clients']
        });
    }, []);

    return (
        <HStack spacing={ 2 }>
            { grant.business || grant.client ? (
                <OrganizationPersona
                    for={ grant.business || grant.client }
                    within={ grant.business ? grant.client : null }
                    primaryLabel={ t => roleTitle(t, grant.role) }
                    size="sm"
                />
            ) : (
                <HStack width="full">
                    <Badge colorScheme="orange">
                        { t('Platform') }
                    </Badge>
                    <Text>
                        { roleTitle(t, grant.role) }
                    </Text>
                </HStack>
            ) }
            <Spacer/>
            { manageAllowed && user.id != currentUser.id && (
                <>
                    <Tooltip label={ t('Change role') }>
                        <UserGrantChangeButton
                            user={ user }
                            grant={ grant }
                        />
                    </Tooltip>
                    <ActionIcon
                        tooltip={ t => t('Revoke') }
                        tooltipPlacement="left"
                        permission="manage_iam"
                        iconName="delete"
                        onClick={ onRevoke }
                        working={ revokeWorking }
                    />
                </>
            ) }
        </HStack>
    );
};

/**
*   List of grants for the given `user` for management.
*/
export const UserGrantList = ({ user }: { user: UserModel }) => {
    const t = useI18n();

    return (
        <VStack width="full" alignItems="left">
            { user.grants.length ? (
                user.grants.map(grant => (
                    <UserGrantListItem
                        key={ grant.id }
                        user={ user } grant={ grant }
                    />
                ))
            ) : (
                <Text variant="light">
                    { t('No roles granted.') }
                </Text>
            ) }
        </VStack>
    );
};

/**
*   User list item with grant enumeration and activation control, etc.
*/
export const UserCard = ({ user }: { user: UserModel }) => {
    const t = useI18n();

    const currentUser = useCurrentUser();

    const manageAllowed = useUserManageAuthzCheck(user);
    // The only use-case for role management on this screen is adding platform-level
    // roles, which can only be done by users with manage_iam at platform level.
    const rolesAllowed = useAuthzCheck('manage_iam', {
        scope: { clientId: null, businessId: null }
    });

    const [sidebarControl, onOpenSidebar] = useSidebarControl();

    const manageEnabled = user.id != currentUser.id && manageAllowed;
    const rolesEnabled = user.id != currentUser.id && rolesAllowed;
    return (
        <BlockCard width="17rem" height="auto">
            <VStack width="full" alignItems="left" spacing={ 4 }>
                <HStack width="full" justifyContent="flex-start">
                    <UserPersona
                        for={ user }
                        withType headingName
                        nameExtras={
                            <StateBadge state={ user.state } inactiveOnly/>
                        }
                    />
                </HStack>
                <HStack width="full">
                    <Popover placement="left">
                        <PopoverTrigger>
                            <ClickTarget p={ 2 }>
                                <HStack>
                                    <Icon name="manage"/>
                                    <Text fontSize="xs">
                                        { t('{count} role{count::s}', {
                                            count: user.grants.length
                                        }) }
                                    </Text>
                                </HStack>
                            </ClickTarget>
                        </PopoverTrigger>
                        <Portal>
                            <PopoverContent>
                                <PopoverArrow/>
                                <PopoverBody p={ 4 }>
                                    <UserGrantList user={ user }/>
                                </PopoverBody>
                            </PopoverContent>
                        </Portal>
                    </Popover>
                    <Spacer/>
                    { manageEnabled && (
                        <ActiveStateToggleButton
                            for={ user }
                            endpoint={ api => api.users.id(user.id) }
                            queryKeys={ ['users'] }
                            permission="manage_iam"
                            activateDetails={
                                t => t('This allows users to log in again.')
                            }
                            deactivateDetails={
                                t => t('This prevents users from logging in.')
                            }
                        />
                    ) }
                    { rolesEnabled && (
                        <ModalButton
                            variant="ghost"
                            iconName="add"
                            tooltip={ t => t('Add role') }
                        >
                            { onClose => (
                                <AddPlatformGrantToUser
                                    user={ user }
                                    onDone={ onClose }
                                />
                            ) }
                        </ModalButton>
                    ) }
                    { (manageEnabled || user.id == currentUser.id) && (
                        <ActionIcon
                            tooltip={ t => t('Edit') }
                            tooltipPlacement="left"
                            // Button only shown if permissions valid.
                            permission={ null }
                            iconName="edit"
                            onClick={ onOpenSidebar }
                        />
                    ) }
                </HStack>
            </VStack>
            <Sidebar control={ sidebarControl }>
                <UserEditForm
                    user={ user }
                    onDone={ sidebarControl.close }
                />
            </Sidebar>
        </BlockCard>
    );
};

/**
*   User management screen.
*/
export const UserManager = ({ users }: {
    users: UserModel[] | null
}) => {
    const invalidate = useInvalidate();

    const { ListProvider, List, ListFilterInput } = useUserList();

    // Although any user with manage_iam at any scope can invite users, we only
    // show the invite button on this screen for platform-level IAM use-cases.
    const globalIAMAllowed = useAuthzCheck('manage_iam', {
        scope: { clientId: null, businessId: null }
    });

    const onInvite = useCallback(() => {
        invalidate({
            queryKeys: ['users']
        });
    }, []);

    return (
        <ListProvider data={ users }>
            <ManagerLayout
                heading={ t => t('Users') }
                description={ t => t('Manage users and roles.') }
                headerRight={
                    <>
                        { globalIAMAllowed && (
                            <UserInviteButton onInvited={ onInvite }/>
                        ) }
                        <Box px={ 2 }>
                            <ListFilterInput/>
                        </Box>
                        <Icon name="search"/>
                    </>
                }
            >
                <Flex flexWrap="wrap" gap={ 4 }>
                    <List noLayout>
                        { user => (
                            <UserCard
                                key={ user.id }
                                user={ user }
                            />
                        ) }
                    </List>
                </Flex>
            </ManagerLayout>
        </ListProvider>
    );
};
