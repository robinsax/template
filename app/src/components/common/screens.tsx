/**
*   Route-level screen layouts. 
*/
import React, { ReactNode, UIEvent, useState, useCallback } from 'react';
import { Box, Flex, HStack, VStack, Spacer, useColorMode } from '@chakra-ui/react';
import { AppShell } from '@saas-ui/react';

import { vignetteGenerator, useHideScrollbars } from '@/theme';
import { useCurrentUserOrNull, useContinuousTick, useI18n } from '@/hooks';
import { OwnPersona } from '@/components/users';

import { AppSidebar } from './sidebar';
import { LocaleSelect, ThemeToggle } from './settings';
import { Icon } from './icons';
import { Brand } from './brand';

/**
*   Background vignette UI. Subtly animated if `run` is `true`.
*/
const Vignettes = ({ run }: { run: boolean }) => {
    const { colorMode } = useColorMode();

    const value = useContinuousTick({
        coef: 0.0001,
        active: run
    });

    return (
        <Box
            position="fixed"
            top={ 0 } left={ 0 } right={ 0 } bottom={ 0 }
            zIndex={ -1 }
        >
            <style>
                { '#vignette { ' + vignetteGenerator(value, colorMode == 'dark') + '}' }
            </style>
            <Box
                id="vignette"
                height="100vh"
                width="100vw"
            />
        </Box>
    );
};

/**
*   Splash screen layout.
*/
export const SplashScreen = ({ children }: { children: React.ReactNode }) => {
    const t = useI18n();

    const user = useCurrentUserOrNull();

    return (
        <AppShell>
            <Vignettes run={ true }/>
            <VStack height="100vh">
                <HStack p={ 4 } width="full" justifyContent="left" spacing={ 6 }>
                    { user && (
                        <OwnPersona size="sm" avatarOnly/>
                    ) }
                </HStack>
                <Flex height="full" justifyContent="center" alignItems="center">
                    { children }
                </Flex>
                <HStack p={ 4 } width="full" justifyContent="left" spacing={ 4 }>
                    <HStack
                        spacing={ 2 } fontSize="xs"
                        position="relative" top="0.5rem"
                    >
                        <a href="/terms" target="_blank">
                            { t('Terms') }
                        </a>
                        <a href="/privacy" target="_blank">
                            { t('Privacy') }
                        </a>
                    </HStack>
                    <Spacer/>
                    <LocaleSelect/>
                    <ThemeToggle/>
                </HStack>
            </VStack>
        </AppShell>
    );
};

/**
*   Standard screen layout with sidebar.
*/
export const SidebarScreen = ({ children }: {
    children: ReactNode
}) => {
    return (
        <AppShell
            sidebar={
                <AppSidebar/>
            }
        >
            <Vignettes run={ false }/>
            <Box
                flex={ 1 } px={ 16 } py={ 12 } overflowY="auto"
                id="main-scroll-area"
            >
                { children }
            </Box>
        </AppShell>
    );
};

/**
*   A splash screen screen with a scrollable content box.
*/
export const SplashInfoScreen = ({ children }: { children: ReactNode }) => {
    const [bottom, setBottom] = useState(false);

    const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
        const scrollArea = event.currentTarget;
        if (!scrollArea) return;

        const scrollHeight = scrollArea.scrollHeight;
        const scrollTop = scrollArea.scrollTop;
        const clientHeight = scrollArea.clientHeight;

        setBottom(scrollHeight - scrollTop <= clientHeight - scrollArea.clientTop + 10);
    }, []);

    const hideScrollbarStyles = useHideScrollbars();

    return (
        <SplashScreen>
            <VStack>
                <VStack
                    height="60vh" width="35rem"
                    overflowY="scroll"
                    alignItems="left"
                    spacing={ 8 }
                    { ...hideScrollbarStyles }
                    onScroll={ onScroll }
                >
                    <Brand/>
                    { children }
                </VStack>
                <Icon name={ bottom ? 'up' : 'down' }/>
            </VStack>
        </SplashScreen>
    );
};
