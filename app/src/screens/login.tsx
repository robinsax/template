import React, { useCallback, useMemo, useState } from "react";
import {
    Box, HStack, Alert, VStack, Text, Heading, Button, Spacer
} from "@chakra-ui/react";
import { Navigate, Link, useSearchParams } from "react-router-dom";

import {
    useLoginForm, usePasswordChangeForm, usePasswordResetForm
} from "@/components/users";
import { Brand, BlockCard, FormLayout, Icon } from "@/components/design";
import { useCurrentUserOrNull, useI18n } from "@/hooks";

export const Login = () => {
    const t = useI18n();

    const [searchParams, setSearchParams] = useSearchParams();

    const user = useCurrentUserOrNull();

    if (user) {
        return <Navigate to={ searchParams.get("dest") || "/" }/>;
    }

    const [resetRequestStage, setResetRequestStage] = useState(0);
    const [resetSuccess, setResetSuccess] = useState(false);

    const [resetToken, resetUserId] = useMemo(() => {
        const token = searchParams.get("reset");
        const userId = searchParams.get("user");
        if (!token || !userId) return [null, null];

        return [token, userId];
    }, [searchParams]);

    const onReset = useCallback(() => {
        setSearchParams({});
        setResetSuccess(true);
    }, []);

    const login = useLoginForm();
    const reqReset = usePasswordResetForm(() => setResetRequestStage(2));
    const reset = usePasswordChangeForm(onReset, resetToken, resetUserId);

    return (
        <VStack>
            <Box width="full" textAlign="center" mb={ 4 }>
                <Brand size="lg"/>
            </Box>
            <BlockCard width="24rem" height="auto">
                { resetRequestStage > 0 ? (
                    <VStack width="full" spacing={ 4 }>
                        <Heading size="sm">
                            { t("Reset your password") }
                        </Heading>
                        <Text variant="light">
                            {
                                // eslint-disable-next-line max-len
                                t("Enter your email and we\"ll send you a password reset link.") 
                            }
                        </Text>
                        { resetRequestStage == 1 ? (
                            <reqReset.FormProvider>
                                <FormLayout>
                                    <reqReset.FormError/>
                                    <reqReset.FormFields names={ ["email"] }/>
                                    <reqReset.FormSubmit
                                        label={ t => t("Request Reset") }
                                        iconName="lock"
                                    />
                                </FormLayout>
                            </reqReset.FormProvider>
                        ) : (
                            <>
                                <Alert status="info">
                                    { t("Check your email for a password reset link.") }
                                </Alert>
                                <Button
                                    onClick={ () => setResetRequestStage(0) }
                                    width="full"
                                    leftIcon={ <Icon name="left"/> }
                                >
                                    { t("Back to login") }
                                </Button>
                            </>
                        )}
                    </VStack>
                ) : resetToken ? (
                    <VStack width="full" spacing={ 4 }>
                        <Alert status="info">
                            { t("You requested a password reset.") }
                        </Alert>
                        <reset.FormProvider>
                            <FormLayout>
                                <reset.FormError/>
                                <reset.FormFields names={ ["updated"] }/>
                                <reset.FormSubmit
                                    label={ t => t("Reset Password") }
                                    iconName="lock"
                                />
                            </FormLayout>
                        </reset.FormProvider>
                    </VStack>
                ) : (
                    <VStack width="full" spacing={ 4 }>
                        { resetSuccess && (
                            <Alert status="info">
                                { t("Your password has been reset.") }
                            </Alert>
                        ) }
                        <login.FormProvider>
                            <FormLayout>
                                <login.FormError/>
                                <login.FormFields names={ ["email", "password"] }/>
                                <login.FormSubmit
                                    label={ t => t("Log in") }
                                    iconName="logIn"
                                />
                            </FormLayout>
                        </login.FormProvider>
                    </VStack>
                ) }
            </BlockCard>
            { !resetRequestStage && (
                <HStack width="full" pt={ 1 }>
                    <Text
                        variant="light" cursor="pointer"
                        as={ Link }
                        to={ "/home" }
                    >
                        { t("What\"s Kedet?") }
                    </Text>
                    <Spacer/>
                    <Text
                        variant="light" cursor="pointer"
                        onClick={ () => setResetRequestStage(1) }
                    >
                        { t("Forgot your password?") }
                    </Text>
                </HStack>
            ) }
        </VStack>
    );
};

export default Login;