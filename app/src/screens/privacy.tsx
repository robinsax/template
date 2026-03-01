import React from "react";
import { Heading, Text } from "@chakra-ui/react";

import { useI18n } from "@/hooks";
import { SplashInfoScreen } from "@/components/common";

export const Privacy = () => {
    const t = useI18n();

    return (
        <SplashInfoScreen>
            <Heading>{ t("Privacy Policy") }</Heading>
            { /* eslint-disable max-len */ }
            <Text>
                { t("Not implemented yet.") }
            </Text>
        </SplashInfoScreen>
    );
};
