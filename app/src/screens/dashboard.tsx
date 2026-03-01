import React, { useCallback } from "react";
import { HStack, Heading, VStack, Spacer, Text, Switch } from "@chakra-ui/react";

import { I18nValueFn, useCurrentUser, useI18n } from "@/hooks";
import {
    NotificationsList, useNotificationsShowAll, useDismissNotifications, useNotifications
} from "@/components/users";
import {
    BlockCard, ActionIcon, IconName, Icon
} from "@/components/common";

const SectionHeading = ({ heading, detail, iconName }: {
    iconName: IconName,
    heading: I18nValueFn,
    detail: I18nValueFn
}) => {
    const t = useI18n();

    return (
        <HStack spacing={ 2 }>
            <Icon name={ iconName } size="1.5rem"/>
            <VStack width="full" alignItems="left" spacing={ 1 }>
                <Heading size="sm">
                    { heading(t) }
                </Heading>
                <Text variant="light">
                    { detail(t) }
                </Text>
            </VStack>
        </HStack>
    );
};

const Notifications = () => {
    const t = useI18n();

    const [all, setAll] = useNotificationsShowAll();
    const onDismiss = useDismissNotifications();
    const notifications = useNotifications();

    const onDismissAll = useCallback(() => {
        if (!notifications) return;

        onDismiss(notifications.map(notification => notification.id));
    }, [notifications, onDismiss]);

    return (
        <VStack alignItems="left" width="20rem" spacing={ 2 }>
            <SectionHeading
                iconName="notifications"
                heading={ t => t("Your Notifications") }
                detail={ t => t("Recent notifications.") }
            />
            <BlockCard width="20rem" height="auto">
                <HStack width="full" mb={ 4 }>
                    <Switch
                        isChecked={ all }
                        onChange={ (e) => setAll(e.target.checked) }
                    />
                    <Text fontSize="xs" my={ 2 }>
                        { t("Show seen") }
                    </Text>
                    <Spacer/>
                    { !all && notifications && notifications.length > 0 && (
                        <ActionIcon
                            tooltip={ t => t("Dismiss all") }
                            tooltipPlacement="right"
                            iconName="delete"
                            permission={ null }
                            onClick={ onDismissAll }
                        />
                    ) }
                </HStack>
                <NotificationsList/>
            </BlockCard>
        </VStack>
    );
};

export const Dashboard = () => {
    const t = useI18n();

    const user = useCurrentUser();

    return (
        <VStack width="full" alignItems="left" spacing={ 12 }>
            <Heading>
                { t("Welcome back, {name}!", {
                    name: user.name.split(" ")[0]
                })}
            </Heading>
            <HStack width="full" alignItems="flex-start">
                <Notifications/>
            </HStack>
        </VStack>
    );
};
