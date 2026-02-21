/**
*   Reusable components for model state presentation and control. 
*/
import React from 'react';
import { Badge, Tooltip } from '@chakra-ui/react';

import { ModelState, Permission } from '@/models';
import {
    APIClient, QueryKey, I18nValueFn, useInvalidate, useI18n, useAsyncCallback, useAPI,
    useAuthzCheck
} from '@/hooks';

import { ConfirmedButton } from './actions';

const modelStateTitles: Record<ModelState, I18nValueFn> = {
    inactive: t => t('Inactive'),
    active: t => t('Active')
};

/**
*   Returns an {@link I18nValueFn} for the given {@link ModelState}.
*/
export const stateTitle = (state: ModelState) => modelStateTitles[state];

/**
*   {@link Badge} UI for the given {@link ModelState}.
*/
export const StateBadge = ({ state, inactiveOnly }: {
    state: ModelState,
    inactiveOnly?: boolean
}) => {
    const t = useI18n();

    return (!inactiveOnly || state == 'inactive') && (
        <Badge colorScheme={ state == 'inactive' ? 'red' : 'green' }>
            { stateTitle(state)(t) }
        </Badge>
    );
};

/**
*   Base type for models with state.
*/
export type ModelWithActiveState = {
    state: ModelState,
    name: string
};

export type ActivationStateEndpoint = {
    state: {
        put: (data: { state: ModelState }) => Promise<unknown>
    }
};

/**
*   A button to toggle model activation state.
*/
export const ActiveStateToggleButton = ({
    for: forProp, queryKeys, permission, endpoint, activateDetails, deactivateDetails
}: {
    for: ModelWithActiveState,
    queryKeys: QueryKey[],
    permission: Permission,
    endpoint: (api: APIClient) => ActivationStateEndpoint,
    activateDetails: I18nValueFn,
    deactivateDetails: I18nValueFn
}) => {
    const t = useI18n();
    const api = useAPI();
    const invalidate = useInvalidate();

    const allowed = useAuthzCheck(permission);

    const [onActivationChange, activationWorking] = useAsyncCallback(async () => {
        const state = forProp.state == 'active' ? 'inactive' : 'active';

        await endpoint(api).state.put({ state });

        invalidate({
            queryKeys
        });
    }, [forProp.state]);

    return (
        <Tooltip
            label={
                forProp.state == 'active' ? t('Deactivate') : t('Reactivate')
            }
        >
            <ConfirmedButton
                variant="ghost"
                iconName="lock"
                isLoading={ activationWorking }
                disabled={ !allowed }
                requireEntry={ forProp.name }
                confirmDetail={ 
                    forProp.state == 'active' ? deactivateDetails(t) : activateDetails(t)
                }
                onConfirm={ onActivationChange }
            />
        </Tooltip>
    );
};
