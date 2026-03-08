import { useI18n } from "@/hooks";

import { Button, Stack, Spacer, Link, Icon } from "../base";
import { Brand } from "./branding";

export const AppHeader = () => {
    const t = useI18n();

    return (
        <Stack
            width="100%"
            borderBottom="1px solid"
            borderColor="border"
            boxShadow="normalDrop"
            px={ 4 } py={ 3 }
        >
            <Brand variant="sm"/>
            <Spacer/>
            <Button>
                <Link href="login">
                    <Icon name="login"/>
                    { t("Log In") }
                </Link>
            </Button>
        </Stack>
    );
};
