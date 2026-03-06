/**
*   Route-level screen layouts. 
*/
import React, { ReactNode, UIEvent, useState, useCallback } from "react";
import { Box, Flex, HStack, VStack, Spacer } from "@chakra-ui/react";
import { AppShell, Persona } from "@saas-ui/react";

import config from "@/config";
import { useHideScrollbars } from "@/theme";
import { useI18n, useQuery } from "@/hooks";
import { queryCurrentUser } from "@/state";
import { Icon, Brand, ClickableLink } from "@/components/design";

import { AppSidebar } from "./sidebar";
import { AppHeader } from "./header";
import { LocaleSelect, ThemeToggle } from "./settings";

/**
*   Splash screen layout.
*/
export const SplashScreen = ({ children }: { children: React.ReactNode }) => {
    const t = useI18n();

    const [user] = useQuery(queryCurrentUser);

    return (
        <AppShell
            navbar={ <AppHeader/> }
        >
            <VStack height="100vh">
                <HStack p={ 4 } width="full" justifyContent="left" spacing={ 6 }>
                    { user && (
                        <Persona size="sm" name={ user.name }/>
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
                        <ClickableLink href="/terms" target="_blank">
                            { t("Terms") }
                        </ClickableLink>
                        <ClickableLink href="/privacy" target="_blank">
                            { t("Privacy") }
                        </ClickableLink>
                        <Box
                            fontSize="2xs"
                            color="lightText"
                        >
                            { t(config.copyright) }
                        </Box>
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
                <Icon name={ bottom ? "up" : "down" }/>
            </VStack>
        </SplashScreen>
    );
};
