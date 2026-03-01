/**
*   Authorization schema presentation.
*/
import React, { useMemo } from "react";
import { ListItem, UnorderedList, Box, Text } from "@chakra-ui/react";

import config from "@/config";
import { Role, Permission, UserType, permissionsMatrix } from "@/models";
import { I18nFn, I18nValueFn, useI18n } from "@/hooks";

// Definitions.
const roleTitles: Record<Role, I18nValueFn> = {
    admin: t => t("Admin"),
    account_manager: t => t("Account Manager"),
    campaign_manager: t => t("Campaign Manager"),
    data_analyst: t => t("Data Analyst"),
    business_manager: t => t("Business Manager"),
    manager: t => t("Manager"),
    member: t => t("Member")
};

const permissionDescriptions: Record<Permission, I18nValueFn> = {
    manage_iam: t => t("Manage users and roles"),
    manage_oauths: t => t("Manage ad channel integrations"),
    manage_clients: t => t("Manage clients"),
    manage_org: t => t("Manage individual client or business"),
    manage_briefs: t => t("Manage campaign briefs"),
    manage_campaigns: t => t("Manage campaigns"),
    manage_creatives: t => t("Manage campaign creative"),
    view_campaign_contents: t => t("View campaign state and creatives"),
    view_analytics: t => t("View analytics")
};

const userTypeTitles: Record<UserType, I18nValueFn> = {
    client: t => t("Client Account"),
    platform_owner: t => t(config.platformOwnerName)
};

export const roleTitle = (t: I18nFn, role: Role) => (
    roleTitles[role](t)
);

export const userTypeTitle = (t: I18nFn, userType: UserType) => (
    userTypeTitles[userType](t)
);

/**
*   Renders a summary of the permissions granted by the given `role`.
*/
export const RoleSummary = ({ role }: { role: Role }) => {
    const t = useI18n();

    const permissions = useMemo(() => (
        Object.keys(permissionsMatrix[role]) as Permission[]
    ), [role]);

    return (
        <Box alignItems="left" width="full" fontSize="sm">
            <Text>
                { t("{role}s can:", { role: roleTitle(t, role) }) }
            </Text>
            <UnorderedList width="full" px={ 4 }>
                { permissions.map(permission => (
                    <ListItem key={ permission }>
                        { permissionDescriptions[permission](t) }
                    </ListItem>
                )) }
            </UnorderedList>
        </Box>
    );
};
