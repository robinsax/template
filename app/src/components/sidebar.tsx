/**
*   Global application sidebar. 
*/
import React, { useState } from "react";
import {
    HStack, Spacer, Divider, VStack, Box, Popover, PopoverTrigger, PopoverContent,
    PopoverBody, PopoverArrow, Portal
} from "@chakra-ui/react";
import { NavGroup, NavItem, Sidebar, SidebarSection } from "@saas-ui/react";
import { Link, useLocation } from "react-router-dom";

import { usePanelStylesFix } from "@/theme";
import { useAuthzCheck, useI18n, useSavedState, useWindowListener } from "@/hooks";
import { ClickTarget } from "@/components/common";
import { OwnPersona } from "@/components/users";

import { ThemeToggle, LocaleSelect } from "./settings";
import { Brand } from "../layouts/brand";
import { Icon } from "./icons";

const COLLAPSE_BREAKPOINT = 1000;

/**
*   The global application sidebar.
*/
export const AppSidebar = () => {
    const t = useI18n();
    const location = useLocation();

    const [preferCollapsed, setPreferCollapsed] = useSavedState(
        "sidebar-collapsed", false
    );
    const [forceCollapsed, setForceCollapsed] = useState(false);

    useWindowListener("resize", () => {
        setForceCollapsed(window.innerWidth < COLLAPSE_BREAKPOINT);
    });

    const manageClientAllowed = useAuthzCheck("manage_org", {
        scopeless: true
    });
    const manageUsersAllowed = useAuthzCheck("manage_iam", {
        scopeless: true
    });

    const panelStyles = usePanelStylesFix();

    const collapsed = forceCollapsed || preferCollapsed;

    const settingsControls = (
        <>
            <LocaleSelect/>
            <ThemeToggle/>
        </>
    );
    return (
        <Sidebar
            { ...panelStyles }
            position="relative"
            borderRight="solid 1px"
            borderRightColor="lightBorder"
            boxShadow="raise"
            variant={ collapsed ? "compact" : "default" }
            width={ collapsed ? undefined : "14rem" }
            toggleBreakpoint={ false }
            transition="width 0.1s ease-in-out"
        >
            { !forceCollapsed && (
                <Box
                    { ...panelStyles }
                    position="absolute"
                    top="0.5rem" right="-2.5rem"
                    width="2rem" height="2rem"
                    border="1px solid"
                    borderColor="lightBorder"
                    borderRadius="md"
                >
                    <ClickTarget
                        width="full" height="full"
                        onClick={ () => setPreferCollapsed(!preferCollapsed) }
                        display="flex"
                        alignItems="center" justifyContent="center"
                    >
                        <Icon
                            name={ preferCollapsed ? "right" : "left" }
                            size="0.5rem"
                        />
                    </ClickTarget>
                </Box>
            ) }
            <VStack
                width="full"
                alignItems="right"
                py={ 2 } px={ collapsed ? 1 : 2 }
                spacing={ 4 }
                sx={ { marginTop: "0 !important" } }
            >
                <OwnPersona
                    reverse
                    avatarOnly={ collapsed }
                    height="40px"
                    size="sm"
                    withNotifications
                    withClient
                />
            </VStack>
            <Divider/>
            <SidebarSection>
                <NavItem
                    as={ Link }
                    isActive={ location.pathname == "/" }
                    icon={ <Icon name="dashboard"/> }
                    to="/"
                >
                    { t("Dashboard") }
                </NavItem>
                <NavItem
                    as={ Link }
                    isActive={ location.pathname == "/campaigns" }
                    icon={ <Icon name="ad"/> }
                    to="/campaigns"
                >
                    { t("Campaigns") }
                </NavItem>
                <NavItem
                    as={ Link }
                    isActive={ location.pathname == "/reports" }
                    icon={ <Icon name="analytics"/> }
                    to="/reports"
                    mb={ 3 }
                >
                    { t("Reports") }
                </NavItem>
                { (manageClientAllowed || manageUsersAllowed) && (
                    <NavGroup title={ t("Management") }>
                        { manageClientAllowed && (
                            <NavItem
                                as={ Link }
                                isActive={ location.pathname == "/management/clients" }
                                icon={ <Icon name="manage"/> }
                                to="/management/clients"
                            >
                                { t("Clients") }
                            </NavItem>
                        ) }
                        { manageUsersAllowed && (
                            <NavItem
                                as={ Link }
                                isActive={ location.pathname == "/management/users" }
                                icon={ <Icon name="person"/> }
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
                                <ClickTarget p={ 2 }>
                                    <Icon name="settings"/>
                                </ClickTarget>
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
                        <Brand size="sm"/>
                    </Box>
                </>
            ) }
        </Sidebar>
    );
};
