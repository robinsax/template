import React from 'react';
import { Heading } from '@chakra-ui/react';

import { useI18n } from '@/hooks';
import { SplashInfoScreen } from '@/components/common';

export const Terms = () => {
    const t = useI18n();

    return (
        <SplashInfoScreen>
            <Heading>
                { t('Terms of Service') }
            </Heading>
            <Heading size="md">
                { t('Not implemented yet.') }
            </Heading>
        </SplashInfoScreen>
    );
};
