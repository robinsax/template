import { useState } from "react";

import { useI18n, useQuery } from "@/hooks";
import { queryCurrentUser } from "@/state";
import { reroute } from "@/util";
import { Button, Card, Link, Stack, Text, Box } from "@/components/base";
import { Brand, SplashScreen } from "@/components/global";
import { LoginForm } from "@/components/users";

export default () => {
    const t = useI18n();

    const [email, setEmail] = useState("");

    const [user] = useQuery(queryCurrentUser);

    if (user) return reroute("userHome");
    return (
        <SplashScreen>
            <Stack height="100%" align="center" gap={ 2 }>
                <Brand/>
                <Card width={ 30 }>
                    <LoginForm
                        onEmailChanged={ setEmail }
                        afterPassword={
                            <Box width="100%" textAlign="right" marginTop={ 0.25 }>
                                <Link
                                    underlined
                                    route="loginReset" search={ { email } }
                                    fontSize="sm" color="subtle"
                                    hover={ { color: "text"} }
                                >
                                    { t("Forgot your password?") }
                                </Link>
                            </Box>
                        }
                    />
                </Card>
                <Stack
                    horizontal width="100%" justify="center"
                    fontSize="sm"
                >
                    <Text color="subtle">
                        { t("Don't have an account?") }
                    </Text>
                    <Link route="signup">
                        <Button icon="signup">
                            { t("Sign up") }
                        </Button>
                    </Link>
                </Stack>
            </Stack>
        </SplashScreen>
    );
};
