/**
*   Notifications UI.
*/
import React, {
    ReactNode, MouseEvent, createContext, useCallback, useContext, useEffect, useMemo,
    useState
} from 'react';
import { VStack, Spinner, HStack, Text, Spacer, Box, Tooltip } from '@chakra-ui/react';
import { formatDistanceToNow } from 'date-fns';

import { idToUrlForm } from '@/util';
import { NotificationModel, NotificationType } from '@/models';
import {
    I18nValueFn, InvalidationScope, useAsyncCallback, useAPI, useCurrentUserOrNull,
    useFetchedState, useI18n
} from '@/hooks';
import { useGrowOnHover } from '@/theme';
import { Icon, ClickTargetLink, ClickTarget } from '@/components/common';

import { UserPersona } from './personas';

// Presentations per type.
type NotificationPresentation = {
    label: I18nValueFn<Record<string, string> | null>,
    link: ((notification: NotificationModel) => string) | null
};

const notificationPresentations: Record<NotificationType, NotificationPresentation> = {
    invited: {
        label: t => t('invited you to Kedet. Welcome!'),
        link: null
    },
    campaign_created: {
        label: (t, meta) => (
            (meta && meta.campaign_name) ?
                t('created campaign {name}', {
                    name: meta.campaign_name
                })
            :
                t('created a new campaign')
        ),
        link: notification => (
            `/campaigns/${idToUrlForm(notification.target_id as string)}`
        )
    },
    campaign_submitted: {
        label: (t, meta) => t('submitted {ref} for review', {
            ref: (meta && meta.campaign_name) ? meta.campaign_name : t('a campaign')
        }),
        link: notification => (
            `/campaigns/${idToUrlForm(notification.target_id as string)}/review`
        )
    },
    campaign_changes_requested: {
        label: (t, meta) => t('requested changes to {ref}', {
            ref: (meta && meta.campaign_name) ? meta.campaign_name : t('a campaign')
        }),
        link: notification => (
            `/campaigns/${idToUrlForm(notification.target_id as string)}/review`
        )
    },
    campaign_approved: {
        label: (t, meta) => t('approved {ref}', {
            ref: (meta && meta.campaign_name) ? meta.campaign_name : t('a campaign')
        }),
        link: notification => (
            `/campaigns/${idToUrlForm(notification.target_id as string)}/review`
        )
    },
    campaign_published: {
        label: (t, meta) => t('published {ref}', {
            ref: (meta && meta.campaign_name) ? meta.campaign_name : t('a campaign')
        }),
        link: notification => (
            `/campaigns/${idToUrlForm(notification.target_id as string)}/review`
        )
    },
    campaign_channel_approved: {
        label: (t, meta) => t('{ref} was approved by {chanRef}', {
            ref: (meta && meta.campaign_name) ? meta.campaign_name : t('A campaign'),
            chanRef: (meta && meta.channel) ? meta.channel : t('a channel')
        }),
        link: notification => (
            `/campaigns/${idToUrlForm(notification.target_id as string)}/stage`
        )
    },
    campaign_channel_rejected: {
        label: (t, meta) => t('{ref} was rejected by {chanRef}', {
            ref: (meta && meta.campaign_name) ? meta.campaign_name : t('A campaign'),
            chanRef: (meta && meta.channel) ? meta.channel : t('a channel')
        }),
        link: notification => (
            `/campaigns/${idToUrlForm(notification.target_id as string)}/stage`
        )
    },
    comment_reply: {
        label: (t, meta) => (
            (meta && meta.campaign_name) ?
                t('replied to your comment on {ref}', {
                    ref: meta.campaign_name
                })
            :
                t('replied to your comment')
        ),
        link: notification => (
            `/campaigns/${idToUrlForm(notification.target_id as string)}/review`
        )
    },
    password_reset: {
        label: t => t('requested a password reset'),
        link: null
    }
};

// Context.
type NotificationContext = {
    notifications: NotificationModel[] | null,
    all: boolean,
    onDismiss: (ids: string[]) => void,
    setAll: (all: boolean) => void
};

const context = createContext<NotificationContext>(
    null as unknown as NotificationContext
);

export const useNotifications = () => {
    const { notifications } = useContext(context);

    return notifications;
};

export const useNotificationsShowAll = () => {
    const { all, setAll } = useContext(context);

    return [all, setAll] as const;
};

export const useDismissNotifications = () => {
    const { onDismiss } = useContext(context);

    return onDismiss;
};

/**
*   Provides polled notification for the current user.
*/
export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
    const api = useAPI();

    const currentUser = useCurrentUserOrNull();

    const [all, setAll] = useState(false);

    const [notifications, invalidateNotifications] = useFetchedState(
        !currentUser ? null :
            api => api.users.id(currentUser.id).notifications.get(
                all ? { query: { all: 'true' } } : undefined
            ),
        { pollInterval: 120000 }
    );

    useEffect(() => {
        invalidateNotifications();
    }, [all, !!currentUser]);

    const [onDismiss] = useAsyncCallback(async (ids: string[]) => {
        if (!currentUser || !notifications) return;

        await api.users.id(currentUser.id).notifications.put({
            seen_ids: ids
        });

        invalidateNotifications();
    }, [notifications]);

    return (
        <InvalidationScope
            invalidate={ invalidateNotifications }
            queryKey="notifications"
        >
            <context.Provider value={ { notifications, all, onDismiss, setAll } }>
                {children}
            </context.Provider>
        </InvalidationScope>
    );
};

/**
*   Individual notification list item.
*/
const NotificationItem = ({ notification }: { notification: NotificationModel }) => {
    const t = useI18n();

    const onDismiss = useDismissNotifications();

    const growStyles = useGrowOnHover();

    const [hovered, setHovered] = useState(false);

    const { link, label } = notificationPresentations[notification.type];

    const onClickDismiss = useCallback((event: MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        onDismiss([notification.id]);
    }, [notification, onDismiss]);

    return (
        <ClickTargetLink
            disableHighlight={ !link }
            width="full"
            position="relative"
            p={ 1 } pr={ 2 }
            href={ link ? link(notification) : undefined }
            { ...growStyles }
            onMouseEnter={ () => setHovered(true) }
            onMouseLeave={ () => setHovered(false) }
        >
            <HStack width="full">
                { notification.user && (
                    <UserPersona
                        for={ notification.user }
                        size="xs"
                        avatarOnly
                    />
                ) }
                <VStack spacing={ 0 } alignItems="left">
                    <Text fontSize="xs">
                        { !notification.user ? '' : (notification.user.name + ' ') }
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
                    <Tooltip label={ t('Dismiss') }>
                        <ClickTarget
                            p={ 1 }
                            onClick={ onClickDismiss }
                        >
                            <Icon name="delete"/>
                        </ClickTarget>
                    </Tooltip>
                </Box>
            ) }
        </ClickTargetLink>
    );
};

/**
*   Notifications list.
*/
export const NotificationsList = ({ limit }: {
    limit?: number
}) => {
    const t = useI18n();

    const { notifications } = useContext(context);

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
                                { t('{count} more...', { count: remaining }) }
                            </Text>
                        )}
                    </VStack>
                ) : (
                    <Text
                        width="full" variant="light" textAlign="center"
                        p={ 2 }
                    >
                        { t('No new notifications.') }
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
    const { notifications } = useContext(context);

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
