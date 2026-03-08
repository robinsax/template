import { useState } from "react";

import { reroute } from "@/util";
import { useI18n, useQuery, useSearchParam, useSetRoute } from "@/hooks";
import { queryCurrentUser, mutateResetPassword } from "@/state";
import { Alert, Button, Card, Link, Stack } from "@/components/base";
import { Brand, SplashScreen } from "@/components/global";
import { PasswordSetForm, RequestPasswordResetForm } from "@/components/users";

export default () => {
    const t = useI18n();

    const [success, setSuccess] = useState(false);

    const setRoute = useSetRoute();

    const resetToken = useSearchParam("reset");
    const userId = useSearchParam("user");
    const initialEmail = useSearchParam("email");

    const [user] = useQuery(queryCurrentUser);

    if (user) return reroute("userHome");
    return (
        <SplashScreen>
            <Stack height="100%" align="center" gap={ 2 }>
                <Brand/>
                <Card width={ 30 }>
                    { (resetToken && userId) ? (
                        <PasswordSetForm
                            mutation={ mutateResetPassword }
                            initial={ { userId, password: "", token: resetToken } }
                            onSuccess={ () => setRoute("login") }
                        />
                    ) : success ? (
                        <Alert type="success">
                            { t("Check your email to reset your password.") }
                        </Alert>
                    ) : (
                        <RequestPasswordResetForm
                            initialEmail={ initialEmail }
                            onSuccess={ () => setSuccess(true) }
                        />
                    ) }
                </Card>
                <Stack
                    horizontal width="100%" justify="center"
                    fontSize="sm"
                >
                    <Link route="login">
                        <Button icon="left" iconLeft>
                            { t("Back") }
                        </Button>
                    </Link>
                </Stack>
            </Stack>
        </SplashScreen>
    );
};
