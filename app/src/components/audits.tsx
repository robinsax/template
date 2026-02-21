/**
*   Standalone audit presentation.
*
*   The targets implemented in this module must match those provided by the standalone
*   audit endpoint of the clients API. 
*/
import React, { ComponentType, useMemo } from 'react';
import { ChakraProps, Text, VStack, HStack, Heading, Spacer } from '@chakra-ui/react';
import { formatDistanceToNow } from 'date-fns';

import { error, idToUrlForm } from '@/util';
import {
    AuditStandaloneModel, OrganizationSummaryModel, CampaignSummaryModel,
    BasicAuditEvent, CampaignAuditEvent
} from '@/models';
import { I18nFn, I18nValueFn, useI18n } from '@/hooks';
import { BlockCard, ClickTargetLink } from '@/components/common';
import { OrganizationPersona } from '@/components/organizations';
import { CampaignAISummary, campaignAuditUpdateLabels } from '@/components/campaigns';

import { UserPersona } from './users';

// Target implementations.
const BusinessAuditTarget = ({ summary }: { summary: OrganizationSummaryModel }) => {
    return (
        <OrganizationPersona
            for={ summary } size="sm"
            secondaryLabel={ t => t('Business')}
        />
    );
};

const CampaignsAuditTarget = ({ summary }: { summary: CampaignSummaryModel }) => {
    return (
        <HStack>
            <ClickTargetLink
                href={ '/campaigns/' + idToUrlForm(summary.id) }
                py={ 2 } px={ 1 } mb={ 1 }
            >
                <Heading size="md">{ summary.name }</Heading>
            </ClickTargetLink>
            { summary.ai_summary && (
                <CampaignAISummary campaign={ summary }/>
            ) }
        </HStack>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const targetRenderers: Record<string, ComponentType<{ summary: any }>> = {
    businesses: BusinessAuditTarget,
    campaigns: CampaignsAuditTarget
};

// Event descriptions.
const basicAuditEventDescriptions: Record<BasicAuditEvent, I18nValueFn> = {
    create: t => t('created'),
    update: t => t('updated'),
    delete: t => t('deleted')
};

const eventDescriptions: Record<string, (t: I18nFn, event: string) => string> = {
    campaigns: (t, event) => (
        t('updated') + ' ' + (
            !(event in campaignAuditUpdateLabels) ? '' :
                // @ts-expect-error ts(2722)
                campaignAuditUpdateLabels[event as CampaignAuditEvent](t)
        )
    )
};

/**
*   A card view of a standalone audit including presentation of the target, who did what,
*   and when it happened.
*/
export const StandaloneAuditCard = ({ model, ...props }: {
    model: AuditStandaloneModel
} & ChakraProps) => {
    const t = useI18n();

    const TargetComponent = useMemo(() => (
        model.target_type in targetRenderers ?
            targetRenderers[model.target_type]
        :
            error('Unknown target type: ' + model.target_type, null)
    ), [model.target_type]);

    const eventDescription = useMemo(() => (
        model.target_type in eventDescriptions ?
            eventDescriptions[model.target_type](t, model.event)
        :
            basicAuditEventDescriptions[model.event as BasicAuditEvent](t)
    ), [model.target_type, model.event]);

    return TargetComponent && (
        <BlockCard { ...props }>
            <VStack width="full" alignItems="left">
                { TargetComponent && (
                    <TargetComponent summary={ model.target_summary }/>
                ) }
                <HStack width="full">
                    <UserPersona for={ model.user } size="xs"/>
                    <Spacer/>
                    <VStack alignItems="flex-end" spacing={ 0 }>
                        <Text fontSize="xs">{ eventDescription }</Text>
                        <Text fontSize="xs" variant="light">
                            { formatDistanceToNow(model.occurred_at, {
                                addSuffix: true
                            }) }
                        </Text>
                    </VStack>
                </HStack>
            </VStack>
        </BlockCard>
    );
};
