import React from "react";
import { Heading, Text } from "@chakra-ui/react";

import { useI18n } from "@/hooks";
import { SplashInfoScreen } from "@/components/global";

export default () => {
    const t = useI18n();

    return (
        <SplashInfoScreen>
            <Heading>{ t("Privacy Policy") }</Heading>
            <Text>
                { t("Not authored yet.") }
            </Text>
        </SplashInfoScreen>
    );
};
