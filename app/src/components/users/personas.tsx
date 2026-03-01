/**
*   User persona UI.
*/
import React, { ReactNode, useMemo, useCallback } from "react";
import {
    Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow, HStack,
    VStack, Portal, Text, Box, Spacer, Tooltip
} from "@chakra-ui/react";
import {
    Persona, PersonaAvatar, PersonaDetails, PersonaLabel, PersonaSecondaryLabel
} from "@saas-ui/react";
import { useNavigate } from "react-router-dom";

import { grantContainsScope } from "@/util";
import { AuditSummaryModel, UserModel } from "@/models";
import {
    useCurrentUser, useAuthControl, useAsyncCallback, useI18n, useFetchedUpload,
    useAuthzScope, useActiveClientOrNull, useClients
} from "@/hooks";
import {
    ClickTarget, ActionIcon, Sidebar, Icon, useSidebarControl
} from "@/components/common";
import { OrganizationPersona } from "@/components/organizations";

import { roleTitle, userTypeTitle } from "./authz";
import { UserEditForm } from "./forms";
import { NotificationsIndicator, NotificationsList } from "./notifications";

/**
*   User persona UI with flags to show various information. Can be used as a placeholder
*   layout when `user` is `null`.
*/
export const UserPersona = ({
    children, nameExtras, for: user, size, headingName, avatarOnly, withType, withEmail,
    withRole, reverse, height, draftDataURI
}: {
    children?: ReactNode,
    nameExtras?: ReactNode,
    for: UserModel | null,
    size?: string,
    headingName?: boolean,
    avatarOnly?: boolean,
    withType?: boolean,
    withEmail?: boolean,
    withRole?: boolean,
    reverse?: boolean,
    height?: string,
    draftDataURI?: string | null
}) => {
    const t = useI18n();

    const authzScope = useAuthzScope();

    const role = useMemo(() => {
        if (!user) return null;

        for (const grant of user.grants) {
            if (grantContainsScope(grant, authzScope)) {
                return roleTitle(t, grant.role);
            }
        }

        return null;
    }, [user, t, authzScope]);
    const showRole = withRole && role;

    const avatarDataURI = useFetchedUpload(
        (user && user.avatar) ? user.avatar.thumbnail : null
    );

    const dataURI = useMemo(() => {
        if (draftDataURI) return draftDataURI;
        return avatarDataURI;
    }, [draftDataURI, avatarDataURI]);

    const truncatedEmail = useMemo(() => {
        if (!user) return null;

        if (user.email.length > 25) {
            return user.email.substring(0, 25) + "...";
        }

        return user.email;
    }, [user]);

    const avatar = (
        <PersonaAvatar
            src={ dataURI ? dataURI : undefined }
            name={ user ? user.name : undefined }
            presence={ (!user || user.is_claimed) ? undefined : "offline" }
            presenceLabel={
                (!user || user.is_claimed) ? undefined : t("Invite pending")
            }
            size={ size }
        />
    );

    return (
        <Persona height={ height }>
            { !reverse && avatar }
            { !avatarOnly && (
                <PersonaDetails
                    alignItems={ reverse ? "flex-end" : undefined }
                    marginLeft={ reverse ? "0px" : "0.5rem" }
                    marginRight={ reverse ? "0.5rem" : undefined }
                >
                    <PersonaLabel>
                        <HStack>
                            <Text
                                fontSize={ headingName ? "xl" : undefined }
                                fontFamily={ headingName ? "heading" : undefined }
                                fontWeight={ headingName ? "bold" : undefined }
                                lineHeight={ 0.9 }
                            >
                                { user && user.name }
                            </Text>
                            { nameExtras }
                        </HStack>
                    </PersonaLabel>
                    { user && (children || withType || withEmail || showRole) && (
                        <PersonaSecondaryLabel>
                            { withType && (
                                <>
                                    { userTypeTitle(t, user.type) }
                                    <br/>
                                </>
                            ) }
                            { showRole && (
                                <>
                                    { role }
                                    <br/>
                                </>
                            ) }
                            { withEmail && (
                                <>
                                    <Tooltip label={ user.email }>
                                        { truncatedEmail }
                                    </Tooltip>
                                    <br/>
                                </>
                            ) }
                            { children }
                        </PersonaSecondaryLabel>
                    ) }
                </PersonaDetails>
            ) }
            { reverse && avatar }
        </Persona>
    );
};

/**
*   {@link UserPersona} for the current user with popover account controls,
*   notifications, and active client control.
*/
export const OwnPersona = ({
    size, avatarOnly, reverse, withNotifications, withClient, height
}: {
    size?: string,
    avatarOnly?: boolean,
    reverse?: boolean,
    withNotifications?: boolean,
    withClient?: boolean,
    height?: string
}) => {
    const t = useI18n();
    const navigate = useNavigate();
    const authControl = useAuthControl();

    const user = useCurrentUser();
    const clients = useClients();
    const client = useActiveClientOrNull();

    const [sidebarControl, onSidebarOpen] = useSidebarControl();

    const [onLogout, logoutWorking] = useAsyncCallback(async () => {
        await authControl.logout();
    }, []);

    const onSwitchClient = useCallback(() => {
        navigate("/select-client");
    }, []);

    return (
        <Popover placement="right-start">
            <HStack justifyContent="right">
                <PopoverTrigger>
                    <ClickTarget
                        position="relative" p={ 1 } px={ 2 }
                    >
                        <UserPersona
                            for={ user }
                            reverse={ reverse }
                            avatarOnly={ avatarOnly }
                            size={ size }
                            height={ height }
                            withRole
                        />
                        { withNotifications && (
                            <Box
                                position="absolute"
                                right="0.25rem"
                                top="0.25rem"
                            >
                                <NotificationsIndicator/>
                            </Box>
                        ) }
                        { withClient && client && (
                            <Box
                                position="absolute"
                                right="0rem"
                                bottom="0rem"
                            >
                                <OrganizationPersona
                                    for={ client }
                                    avatarOnly
                                    size="xs"
                                />
                            </Box>
                        ) }
                    </ClickTarget>
                </PopoverTrigger>
            </HStack>
            <Portal>
                <PopoverContent>
                    <PopoverArrow/>
                    <PopoverBody>
                        <VStack spacing={ 2 }>
                            <HStack width="full" justifyContent="left">
                                <UserPersona
                                    for={ user }
                                    withRole withEmail
                                />
                                <Spacer/>
                                <VStack spacing={ 1 }>
                                    <ActionIcon
                                        tooltip={ t => t("Log out") }
                                        tooltipPlacement="right"
                                        iconName="logOut"
                                        permission={ null }
                                        onClick={ onLogout }
                                        working={ logoutWorking }
                                    />
                                    <ActionIcon
                                        tooltip={ t => t("Edit details") }
                                        tooltipPlacement="right"
                                        iconName="edit"
                                        permission={ null }
                                        onClick={ onSidebarOpen }
                                    />
                                </VStack>
                            </HStack>
                            { withClient && (
                                <HStack width="full" justifyContent="flex-end">
                                    <OrganizationPersona
                                        for={ client }
                                        size="sm"
                                        nullHint={ t => t("No client selected") }
                                        reverse
                                    />
                                    { clients.length > 1 && (
                                        <ActionIcon
                                            tooltip={ t => t("Switch client") }
                                            tooltipPlacement="right"
                                            iconName="switch"
                                            permission={ null }
                                            onClick={ onSwitchClient }
                                        />
                                    ) }
                                </HStack>
                            ) }
                            { withNotifications && (
                                <VStack mt={ 4 } width="full" alignItems="left">
                                    <HStack width="full" color="lightText">
                                        <Icon name="notifications"/>
                                        <Text fontSize="xs">
                                            { t("Notifications") }
                                        </Text>
                                    </HStack>
                                    <NotificationsList
                                        limit={ 5 }
                                    />
                                </VStack>
                            ) }
                        </VStack>
                    </PopoverBody>
                </PopoverContent>
            </Portal>
            <Sidebar control={ sidebarControl }>
                <UserEditForm
                    user={ user }
                    onDone={ sidebarControl.close }
                />
            </Sidebar>
        </Popover>
    );
};

/**
*   User persona derived from an {@link AuditSummaryModel}, which can contain `"self"`
*   to refer to the current user.
*/
export const AuditSummaryUserPersona = ({ summary }: {
    summary: AuditSummaryModel
}) => {
    const currentUser = useCurrentUser();

    const user = useMemo(() => {
        const who = summary.last_updated_by;
        
        return who == "self" ? currentUser : who as UserModel;
    }, [summary, currentUser]);

    return (
        <UserPersona
            for={ user }
            size="2xs"
        />
    );
};
