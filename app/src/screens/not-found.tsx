import React from "react";
import { Heading, Text, Box, VStack } from "@chakra-ui/react";

import { useI18n } from "@/hooks";
import { SplashScreen } from "@/components/global";

export const NotFoundScreen = () => {
    const t = useI18n();

    return (
        <SplashScreen>
            <VStack textAlign="center" spacing={ 8 }>
                <Box textAlign="left">
                    <Heading fontSize="10rem">
                        { t("404") }
                    </Heading>
                    <Text width="full" variant="light">
                        { t("Page not found") }
                    </Text>
                </Box>
            </VStack>
        </SplashScreen>
    );
};

export default NotFoundScreen;