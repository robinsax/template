/**
*   Branding UI.
*/
import React from "react";
import { Heading, Badge, HStack } from "@chakra-ui/react";

import config from "@/config";
import { useI18n } from "@/hooks";

export const Brand = ({ variant }: { variant?: "sm" | "lg" }) => {
    const t = useI18n();

    return (
        <HStack>
            <Heading
                fontSize={ variant == "sm" ? "1.5rem" : "3rem" }
                fontWeight="bold"
            >
                { t(config.appName) }
            </Heading>
            <Badge
                bg="blue.500" color="gray.50"
                fontSize={ variant == "sm" ? "0.6rem" : "0.75rem" }
            >
                { t("Beta") }
            </Badge>
        </HStack>
    );
};