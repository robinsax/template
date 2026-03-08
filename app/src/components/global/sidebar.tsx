/**
*   Global application sidebar. 
*/
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
    useAuthzCheck, useI18n, useWindowListener, useQuery, useMutation
} from "@/hooks";
import { mutateLocalSettings, queryLocalSettings } from "@/state";
import { Icon, Brand } from "@/components/base";

import { ThemeToggle, LocaleSelect } from "./settings";

const COLLAPSE_BREAKPOINT = 1000;

/**
*   The global application sidebar.
*/
export const AppSidebar = () => {
    const t = useI18n();
    const location = useLocation();

    const [localSettings] = useQuery(queryLocalSettings);
    const [onSettingsChange] = useMutation(mutateLocalSettings);

    const [forceCollapsed, setForceCollapsed] = useState(false);

    useWindowListener("resize", () => {
        setForceCollapsed(window.innerWidth < COLLAPSE_BREAKPOINT);
    });

    const manageUsersAllowed = useAuthzCheck(null, "iam");

    const collapsed = (
        forceCollapsed || (localSettings && localSettings.sidebarCollapsed)
    );

    const settingsControls = (
        <>
            <LocaleSelect/>
            <ThemeToggle/>
        </>
    );
    return (
        <></>
        /*
        <Sidebar
            position="relative"
            borderRight="solid 1px"
            borderRightColor="border"
            boxShadow="raise"
            variant={ collapsed ? "compact" : "default" }
            width={ collapsed ? undefined : "14rem" }
            toggleBreakpoint={ false }
            transition="width 0.1s ease-in-out"
        >
            { !forceCollapsed && (
                <Box
                    position="absolute"
                    top={ 0.5 } right={ -2.5 }
                    width={ 2 } height={ 2 }
                    border="1px solid"
                    borderColor="border"
                    borderRadius="md"
                >
                    <Box
                        width="full" height="full"
                        onClick={ () => onSettingsChange({
                            sidebarCollapsed: !collapsed
                        }) }
                        display="flex"
                        alignItems="center" justifyContent="center"
                    >
                        <Icon
                            name={ collapsed ? "right" : "left" }
                            size="0.5rem"
                        />
                    </Box>
                </Box>
            ) }
            <VStack
                width="full"
                alignItems="right"
                py={ 2 } px={ collapsed ? 1 : 2 }
                spacing={ 4 }
                sx={ { marginTop: "0 !important" } }
            >
                <Persona
                    height="40px"
                    size="sm"
                />
            </VStack>
            <Divider/>
            <SidebarSection>
                <NavItem
                    as={ Link }
                    isActive={ location.pathname == "/" }
                    to="/"
                >
                    { t("Dashboard") }
                </NavItem>
                { manageUsersAllowed && (
                    <NavGroup title={ t("Management") }>
                        { manageUsersAllowed && (
                            <NavItem
                                as={ Link }
                                isActive={ location.pathname == "/management/users" }
                                to="/management/users"
                            >
                                { t("Users") }
                            </NavItem>
                        ) }
                    </NavGroup>
                ) }
            </SidebarSection>
            <Spacer/>
            <SidebarSection>
                <HStack width="full" justifyContent="right" spacing={ 4 }>
                    { collapsed ? (
                        <Popover placement="right-end">
                            <PopoverTrigger>
                                <Icon name="settings"/>
                            </PopoverTrigger>
                            <Portal>
                                <PopoverContent width="auto">
                                    <PopoverArrow/>
                                    <PopoverBody>
                                        <HStack spacing={ 2 }>
                                            { settingsControls }
                                        </HStack>
                                    </PopoverBody>
                                </PopoverContent>
                            </Portal>
                        </Popover>
                    ) : (
                        settingsControls
                    ) }
                </HStack>
            </SidebarSection>
            { !collapsed && (
                <>
                    <Divider/>
                    <Box width="full" pb={ 2 }>
                        <Brand variant="sm"/>
                    </Box>
                </>
            ) }
        </Sidebar>
        */
    );
};
