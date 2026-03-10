import { useI18n, useQuery, useSearchParam } from "@/hooks";
import { reroute } from "@/util";
import { mutateConfirmUserAndLogIn, queryCurrentUser } from "@/state";
import { Card, Stack, Alert } from "@/components/base";
import { Brand, SplashScreen } from "@/components/global";
import { PasswordSetForm } from "@/components/users";

export default () => {
    const t = useI18n();

    const [user] = useQuery(queryCurrentUser);
    const confirmToken = useSearchParam("confirm");

    if (!confirmToken) return reroute("login");
    if (user) return reroute("userHome");
    return (
        <SplashScreen>
            <Stack height="100%" align="center" gap={ 2 }>
                <Brand/>
                <Card width={ 30 }>
                    <Alert marginBottom={ 2 }>
                        { t("Let's set the password for your account.") }
                    </Alert>
                    <PasswordSetForm
                        mutation={ mutateConfirmUserAndLogIn }
                        initial={ { password: "", token: confirmToken } }
                    />
                </Card>
            </Stack>
        </SplashScreen>
    );
};
