/**
*   Route-level screen layouts. 
*/
import { ReactNode } from "react";

import config from "@/config";
import { useI18n } from "@/hooks";
import { Stack, Link, Spacer, Box, Text } from "@/components/base";

import { AppSidebar } from "./sidebar";
import { AppHeader } from "./header";
import { LocaleSelect, ThemeToggle } from "./settings";

/**
*   Splash screen layout.
*/
export const SplashScreen = ({ children, header = false }: {
    children: ReactNode,
    header?: boolean
}) => {
    const t = useI18n();

    return (
        <Stack minHeight="100vh">
            { header && <AppHeader/> }
            <Stack
                justify="center" align="center"
                flex={ 1 } width="100%" height="100%"
            >
                { children }
            </Stack>
            <Stack
                horizontal width="100%" justify="start"
                paddingX={ 2 } paddingY={ 1 }
            >
                <Stack horizontal fontSize="sm">
                    <Link underlined route="terms" target="_blank">
                        { t("Terms") }
                    </Link>
                    <Link underlined route="privacy" target="_blank">
                        { t("Privacy") }
                    </Link>
                    <Text fontSize="xs" color="subtle">
                        { t(config.copyright) }
                    </Text>
                </Stack>
                <Spacer/>
                <ThemeToggle/>
                <LocaleSelect/>
            </Stack>
        </Stack>
    );
};

/**
*   Standard screen layout with sidebar.
*/
export const SidebarScreen = ({ children }: {
    children: ReactNode
}) => {
    return (
        <Stack horizontal>
            <AppSidebar/>
            <Box flex={ 1 } padding={ 4 }>
                { children }
            </Box>
        </Stack>
    );
};
