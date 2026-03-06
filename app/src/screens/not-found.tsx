import React from "react";
import { Heading, Text, Box, VStack } from "@chakra-ui/react";

import { useI18n } from "@/hooks";
import { SplashScreen } from "@/components/global";

export default () => {
    const t = useI18n();

    return (
        <SplashScreen>
            <VStack textAlign="center" spacing={ 8 }>
                <Box textAlign="left">
                    <Heading fontSize="10rem">
                        { t("404") }
                    </Heading>
                    <Box
                        position="relative"
                        top={ -3 }
                    >
                        <Box
                            bg="selection"
                            width="80%"
                            height={ 2 }
                        />
                        <Box
                            bg="success"
                            width="50%"
                            height={ 2 }
                        />
                        <Box
                            bg="warning"
                            width="40%"
                            height={ 2 }
                        />
                        <Box
                            bg="error"
                            width="35%"
                            height={ 2 }
                        />
                    </Box>
                    <Text width="full" variant="light" textAlign="right">
                        { t("Page not found") }
                    </Text>
                </Box>
            </VStack>
        </SplashScreen>
    );
};
