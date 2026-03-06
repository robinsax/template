import React from "react";
import { Button, HStack, Spacer } from "@chakra-ui/react";
import { Link } from "react-router-dom";

import { useI18n } from "@/hooks";
import { routes } from "@/routing";

import { Brand, Icon } from "../design";

export const AppHeader = () => {
    const t = useI18n();

    return (
        <HStack
            width="100%"
            borderBottom="1px solid"
            borderColor="border"
            boxShadow="light"
            px={ 4 } py={ 3 }
        >
            <Brand variant="sm"/>
            <Spacer/>
            <Button
                as={ Link }
                rightIcon={ <Icon name="login"/> }
                to={ routes.login }
            >
                { t("Log In") }
            </Button>
        </HStack>
    );
};
