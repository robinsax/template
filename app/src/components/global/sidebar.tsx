/**
*   Global application sidebar. 
*/
import { useState } from "react";

import {
    useAuthzCheck, useI18n, useWindowListener, useQuery, useMutation
} from "@/hooks";
import { mutateLocalSettings, queryLocalSettings } from "@/state";
import {
    Icon, Box, Stack, Spacer, Popover, Button, NavLink
} from "@/components/base";
import { ActiveUserMenu } from "@/components/users";

import { ThemeToggle, LocaleSelect } from "./settings";
import { Brand } from "./branding";

const COLLAPSE_BREAKPOINT = 1000;

/**
*   The global application sidebar.
*/
export const AppSidebar = () => {
    const t = useI18n();

    const [localSettings] = useQuery(queryLocalSettings);
    const [onSettingsChange] = useMutation(mutateLocalSettings);

    const [forceCollapsed, setForceCollapsed] = useState(false);

    useWindowListener("resize", () => {
        setForceCollapsed(window.innerWidth < COLLAPSE_BREAKPOINT);
    });

    const adminAllowed = !useAuthzCheck(null, ["iam"]);

    const collapsed = (
        forceCollapsed || (!!localSettings && localSettings.sidebarCollapsed)
    );
    const width = collapsed ? 5 : 16;

    const settings = <>
        <ThemeToggle/>
        <LocaleSelect/>
    </>;
    return <>
        <Box height={ 1 } width={ width }/>
        <Stack
            position="fixed" top={ 0 } left={ 0 }
            height="100vh" backgroundColor="background"
            borderRight="default" borderRightColor="border"
            boxShadow="defaultDrop"
            padding={ 1 } width={ width }
        >
            { !forceCollapsed && (
                <Box
                    position="absolute"
                    top={ 0.5 } right={ -2.5 }
                    width={ 2 } height={ 2 }
                    border="default" borderColor="border"
                    borderRadius={ 0.25 }
                >
                    <Box
                        width="100%" height="100%"
                        display="flex" alignItems="center" justifyContent="center"
                        cursor="pointer" boxShadow="defaultDrop"
                        onClick={ () => onSettingsChange({
                            sidebarCollapsed: !collapsed
                        }) }
                    >
                        <Icon name={ collapsed ? "right" : "left" }/>
                    </Box>
                </Box>
            ) }
            <Stack horizontal width="100%" justify="end">
                <ActiveUserMenu
                    small={ collapsed }
                    width={ collapsed ? "100%" : undefined }
                    buttonStyles={ collapsed ? { width: "100%" } : {} }
                />
            </Stack>
            <Stack width="100%" gap={ 0.5 }>
                <NavLink route="userHome" icon="dashboard">
                    { t("Dashboard") }
                </NavLink>
                { adminAllowed && (
                    <NavLink route="admin" icon="admin">
                        { t("Admin") }
                    </NavLink>
                ) }
            </Stack>
            <Spacer/>
            { !collapsed && (
                <Stack horizontal justify="center" width="100%" padding={ 1 }>
                    <Brand small/>
                </Stack>
            ) }
            <Stack horizontal width="100%" justify="center">
                { !collapsed ? settings : (
                    <Popover
                        trigger={ open => (
                            <Button ghost active={ open }>
                                <Icon name="settings" />
                            </Button>
                        ) }
                    >
                        <Stack horizontal>
                            { settings }
                        </Stack>
                    </Popover>
                ) }
            </Stack>
        </Stack>
    </>;
};
