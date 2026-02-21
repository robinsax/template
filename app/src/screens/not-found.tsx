import React from 'react';
import { Heading, Text, Button, Box, VStack, HStack } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

import { useCurrentUserOrNull, useI18n } from '@/hooks';
import { Icon, SplashScreen } from '@/components/common';

export const NotFound = () => {
    const t = useI18n();

    const user = useCurrentUserOrNull();

    return (
        <SplashScreen>
            <VStack textAlign="center" spacing={ 8 }>
                <Box textAlign="left">
                    <Heading fontSize="10rem">
                        { t('404') }
                    </Heading>
                    <Text width="full" variant="light">
                        { t('Page not found') }
                    </Text>
                </Box>
                <HStack width="full" justifyContent="flex-end">
                    { user ? (
                        <Link to="/">
                            <Button leftIcon={ <Icon name="link" /> }>
                                { t('Return to dashboard') }
                            </Button>
                        </Link>
                    ) : (
                        <Link to="/login">
                            <Button leftIcon={ <Icon name="link" /> }>
                                { t('Go to login') }
                            </Button>
                        </Link>
                    ) }
                </HStack>
            </VStack>
        </SplashScreen>
    );
};