/**
*   Route-level screen layouts. 
*/
import { ReactNode } from "react";

import config from "@/config";
import { useI18n } from "@/hooks";
import { Stack, Link, Spacer, Box } from "@/components/base";

import { AppSidebar } from "./sidebar";
import { AppHeader } from "./header";
import { LocaleSelect, ThemeToggle } from "./settings";

/**
*   Splash screen layout.
*/
export const SplashScreen = ({ children, noHeader = false }: {
    children: React.ReactNode,
    noHeader?: boolean
}) => {
    const t = useI18n();

    return (
        <Stack height="100vh">
            { !noHeader && <AppHeader/> }
            <Stack flex={ 1 } justify="center" align="center">
                { children }
            </Stack>
            <Stack width="100%" justify="start" p={ 4 } gap={ 4 }>
                <Stack horizontal fontSize="sm" gap={ 2 }>
                    <Link href="terms" target="_blank">
                        { t("Terms") }
                    </Link>
                    <Link href="privacy" target="_blank">
                        { t("Privacy") }
                    </Link>
                    <Box fontSize="xs" color="subtle">
                        { t(config.copyright) }
                    </Box>
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
            <Box flex={ 1 } p={ 10 }>
                { children }
            </Box>
        </Stack>
    );
};
