import { useEffect } from "react";

import { useForm, useI18n, useQuery, useSetRoute } from "@/hooks";
import { LogInCredentials, mutateAuthStateLogIn, queryCurrentUser } from "@/state";
import { Brand, SplashScreen } from "@/components/global";
import { Alert, Button, Input, Label, Stack } from "@/components/base";

export default () => {
    const t = useI18n();
    const setRoute = useSetRoute();

    const [user] = useQuery(queryCurrentUser);

    useEffect(() => {
        if (user) setRoute("home");
    }, [user, setRoute]);

    const [
        values, setValue, onSubmit, working, error
    ] = useForm<LogInCredentials>(mutateAuthStateLogIn, {
        email: "",
        password: ""
    }, {
        invalid_credential: t => t("Incorrect email or password"),
    });

    return (
        <SplashScreen noHeader>
            <Stack width={ 80 } gap={ 4 }>
                <Brand/>
                { error && (
                    <Alert type="error">
                        { error }
                    </Alert>
                ) }
                <Label forName="email">
                    { t("Email") }
                </Label>
                <Input
                    type="text" name="email"
                    value={ values.email }
                    onChange={ (value) => setValue("email", value) }
                />
                <Label forName="password">
                    { t("Password") }
                </Label>
                <Input
                    type="password" name="password"
                    value={ values.password }
                    onChange={ (value) => setValue("password", value) }
                />
                <Button
                    working={ working }
                    onClick={ onSubmit }
                />
            </Stack>
        </SplashScreen>
    );
};
