import { useState } from "react";

import { useI18n, useQuery } from "@/hooks";
import { queryCurrentUser } from "@/state";
import { reroute } from "@/util";
import { Card, Link, Button, Stack, Text, Alert } from "@/components/base";
import { Brand, SplashScreen } from "@/components/global";
import { CreateUserForm } from "@/components/users";

export default () => {
    const t = useI18n();

    const [success, setSuccess] = useState(false);
    const [user] = useQuery(queryCurrentUser);

    if (user) return reroute("userHome");
    return (
        <SplashScreen>
            <Stack height="100%" align="center" gap={ 2 }>
                <Brand/>
                <Card width={ 30 }>
                    { !success ? <>
                        <Alert marginBottom={ 2 }>
                            { /* eslint-disable-next-line max-len */}
                            { t("We'll send you an email to finish setting up your account.") }
                        </Alert>
                        <CreateUserForm onSuccess={ () => setSuccess(true) }/>
                    </> : <>
                        <Alert type="success">
                            { t("Check your email to finish setting up your account.") }
                        </Alert>
                    </> }
                </Card>
                <Stack
                    horizontal width="100%" justify="center"
                    fontSize="sm"
                >
                    <Text color="subtle">
                        { t("Already have an account?") }
                    </Text>
                    <Link route="login">
                        <Button icon="login">
                            { t("Log in") }
                        </Button>
                    </Link>
                </Stack>
            </Stack>
        </SplashScreen>
    );
};
