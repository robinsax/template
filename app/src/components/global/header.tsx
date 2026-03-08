import { useI18n, useQuery } from "@/hooks";
import { queryCurrentUser } from "@/state";
import { Button, Stack, Spacer, Link, Icon } from "@/components/base";
import { ActiveUserMenu } from "@/components/users";

import { Brand } from "./branding";

export const AppHeader = () => {
    const t = useI18n();

    const [user] = useQuery(queryCurrentUser);

    return (
        <Stack
            horizontal width="100%"
            borderBottom="default" borderColor="border"
            paddingX={ 2 } paddingY={ 1 }
            boxShadow="defaultDrop"
        >
            <Brand variant="sm"/>
            <Spacer/>
            { user ? (
                <ActiveUserMenu/>
            ) : (
                <Link href="login">
                    <Button>
                        { t("Log in") }
                        <Icon name="login" marginLeft={ 0.5 }/>
                    </Button>
                </Link>
            ) }
        </Stack>
    );
};
