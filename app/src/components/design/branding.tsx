/**
*   Branding UI.
*/
import React from "react";
import { Heading, Badge, HStack } from "@chakra-ui/react";
import { Link } from "react-router-dom";

import config from "@/config";
import { useI18n } from "@/hooks";
import { routes } from "@/routing";

export const Brand = ({ variant }: { variant?: "sm" | "lg" }) => {
    const t = useI18n();

    return (
        <HStack as={ Link } to={ routes.home }>
            <Heading
                fontSize={ variant == "sm" ? "1.5rem" : "3rem" }
                fontWeight="bold"
            >
                { t(config.appName) }
            </Heading>
            <Badge
                bg="primary.500" color="gray.50"
                fontSize={ variant == "sm" ? "0.6rem" : "0.75rem" }
            >
                { t("Beta") }
            </Badge>
        </HStack>
    );
};