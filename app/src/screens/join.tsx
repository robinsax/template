import React, { useEffect, useMemo } from "react";
import { Alert, Box, Text, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

import { useI18n } from "@/hooks";
import { Brand, SplashScreen, FormLayout, BlockCard} from "@/components/common";
import { useJoinForm } from "@/components/users";

export const Join = () => {
    const t = useI18n();
    const navigate = useNavigate();

    const inviteToken = useMemo(() => (
        decodeURIComponent(location.search.split("invite=")[1])
    ), []);

    useEffect(() => {
        if (!inviteToken) navigate("/login");
    }, [inviteToken]);

    const { FormProvider, FormFields, FormError, FormSubmit } = useJoinForm();

    return (
        <SplashScreen>
            <Box width="20rem" textAlign="center">
                <Brand size="lg"/>
            </Box>
            <BlockCard width="24rem" height="auto">
                <VStack width="full" alignItems="left" spacing={ 4 }>
                    <Text fontSize="sm" textAlign="center">
                        { t("You\"ve been invited to join.") }
                    </Text>
                    <Alert status="info">
                        { t("Enter a password to set up your account.") }
                    </Alert>
                    <FormProvider>
                        <FormLayout>
                            <FormFields names={ ["password"] }/>
                            <FormError/>
                            <FormSubmit label={ t => t("Accept invite") }/>
                        </FormLayout>
                    </FormProvider>
                </VStack>
            </BlockCard>
        </SplashScreen>
    );
};
