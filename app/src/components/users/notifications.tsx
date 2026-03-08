/**
*   Notifications UI.
*/
import React, { useMemo, useState } from "react";
import { VStack, Spinner, HStack, Text, Spacer, Box, Tooltip } from "@chakra-ui/react";
import { formatDistanceToNow } from "date-fns";

import { NotificationModel, NotificationType } from "@/model";
import {
    I18nValueFn, useI18n, useMutation, useQuery
} from "@/hooks";
import { mutateClearNotifications, queryNotifications } from "@/state";
import { Icon, ClickableLink, Clickable } from "@/components/base";

// Presentations per type.
type NotificationPresentation = {
    label: I18nValueFn<Record<string, string> | null>,
    link: ((notification: NotificationModel) => string) | null
};

const notificationPresentations: Record<NotificationType, NotificationPresentation> = {
    invited: {
        label: t => t("invited you. Welcome!"),
        link: null
    }
};

/**
*   Individual notification list item.
*/
const NotificationItem = ({ notification }: { notification: NotificationModel }) => {
    const t = useI18n();

    const [hovered, setHovered] = useState(false);

    const { link, label } = notificationPresentations[notification.type];

    const [onDismiss] = useMutation(mutateClearNotifications);

    return (
        <ClickableLink
            disableActive={ !link }
            width="full"
            position="relative"
            p={ 1 } pr={ 2 }
            href={ link ? link(notification) : undefined }
            onMouseEnter={ () => setHovered(true) }
            onMouseLeave={ () => setHovered(false) }
        >
            <HStack width="full">
                { notification.user && (
                    notification.user.name
                ) }
                <VStack spacing={ 0 } alignItems="left">
                    <Text fontSize="xs">
                        { !notification.user ? "" : (notification.user.name + " ") }
                        { label(t, notification.cosmetic_metadata) }
                    </Text>
                    <Spacer/>
                    <Text variant="light" fontSize="xs">
                        { formatDistanceToNow(notification.occurred_at, {
                            addSuffix: true
                        }) }
                    </Text>
                </VStack>
            </HStack>
            { hovered && !notification.seen_at && (
                <Box
                    position="absolute"
                    top="50%" transform="translateY(-50%)" right="0px"
                >
                    <Tooltip label={ t("Dismiss") }>
                        <Clickable
                            p={ 1 }
                            onClick={ () => onDismiss({ ids: [notification.id] }) }
                        >
                            <Icon name="delete"/>
                        </Clickable>
                    </Tooltip>
                </Box>
            ) }
        </ClickableLink>
    );
};

/**
*   Notifications list.
*/
export const NotificationsList = ({ limit }: {
    limit?: number
}) => {
    const t = useI18n();

    const [notifications] = useQuery(queryNotifications, { includeSeen: false });

    const [showSet, remaining] = useMemo(() => {
        if (!notifications) return [null, 0];

        if (!limit || notifications.length <= limit) return [notifications, 0];

        return [
            notifications.slice(0, limit),
            notifications.length - limit
        ];
    }, [notifications, limit]);

    return (
        !showSet ? (
            <Box py={ 3 }>
                <Spinner size="xs"/>
            </Box>
        ) : (
            <VStack width="full">
                { showSet.length > 0 ? (
                    <VStack width="full" spacing={ 2 }>
                        { showSet.map(notification => (
                            <NotificationItem
                                key={ notification.id }
                                notification={ notification }
                            />
                        )) }
                        { remaining > 0 && (
                            <Text
                                width="full" variant="light" textAlign="right"
                            >
                                { t("{count} more...", { count: remaining }) }
                            </Text>
                        )}
                    </VStack>
                ) : (
                    <Text
                        width="full" variant="light" textAlign="center"
                        p={ 2 }
                    >
                        { t("No new notifications.") }
                    </Text>
                ) }
            </VStack>
        )
    );
};

/**
*   Notifications indicator. Only renders when there are notifications.
*/
export const NotificationsIndicator = () => {
    const [notifications] = useQuery(queryNotifications, { includeSeen: false });

    return notifications && notifications.length > 0 && (
        <HStack
            height="1rem"
            width="1rem"
            borderRadius="full"
            backgroundColor="warningBg"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            spacing={ 0.5 }
        >
            <Icon size="0.8rem" name="notifications"/>
        </HStack>
    );
};
