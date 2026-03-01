/**
*   Branding UI.
*/
import React from "react";
import { VStack, Heading, Text, Badge, Box } from "@chakra-ui/react";

import config from "@/config";
import { useI18n } from "@/hooks";

export const Brand = ({ size }: { size?: "sm" | "lg" }) => {
    const t = useI18n();

    return (
        <VStack
            width="full" alignItems="center"
            spacing={ 1 }
        >
            <Box position="relative">
                <Heading
                    fontSize={ size == "sm" ? "1.5rem" : "3rem" }
                    fontWeight="bold"
                >
                    { t("REPLACEME") }
                </Heading>
                <Badge
                    colorScheme="blue" position="absolute"
                    right="-8px" bottom="-7px"
                    fontSize={ size == "sm" ? "0.5rem" : "0.75rem" }
                >
                    { t("Beta") }
                </Badge>
            </Box>
            <Text variant="light" fontWeight="bold">
                { t("by {owner}", { owner: t(config.platformOwnerName) }) }
            </Text>
        </VStack>
    );
};