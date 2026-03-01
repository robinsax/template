import React from "react";
import { HStack, VStack, Text, Heading } from "@chakra-ui/react";

import { I18nValueFn, useCurrentUserOrNull, useI18n } from "@/hooks";
import { BlockCard, Brand, SplashScreen, Icon, IconName } from "@/components/common";

export const Landing = () => {
    const t = useI18n();

    const user = useCurrentUserOrNull();

    return (
        <SplashScreen>
            <HStack alignItems="flex-start" spacing={ 10 }>
                <VStack spacing={ 4 }>
                    <Brand/>
                </VStack>
                <VStack width="40rem" alignItems="left" spacing={ 4 }>
                    <Text>
                        { t("About this project.") }
                    </Text>
                </VStack>
            </HStack>
        </SplashScreen>
    );
};