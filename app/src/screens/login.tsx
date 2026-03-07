import React from "react";
import { VStack } from "@chakra-ui/react";

import { AuthParams } from "@/model";
import { useMutation } from "@/hooks";
import { mutateAuthStateLogIn } from "@/state";
import { SplashScreen } from "@/components/global";
import { useFormSystem } from "@/components/systems";
import { Brand } from "@/components/design";

export default () => {
    const {
        FormProvider, FormFields, FormError, FormSubmit
    } = useFormSystem<Omit<AuthParams, "restriction">>({
        fields: {
            email: { type: "text", label: t => t("Email") },
            password: { type: "password", label: t => t("Password") },
        }
    });

    const [onAttempt] = useMutation(mutateAuthStateLogIn);

    return (
        <SplashScreen noHeader>
            <VStack width={ 80 } spacing={ 4 }>
                <Brand/>
                <FormProvider onSubmit={ onAttempt }>
                    <FormFields names={["email", "password"]} />
                    <FormError />
                    <FormSubmit
                        label={ t => t("Log In") }
                        iconName="login"
                    />
                </FormProvider>
            </VStack>
        </SplashScreen>
    );
};
