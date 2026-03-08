/**
*   Branding UI.
*/
import config from "@/config";
import { useI18n } from "@/hooks";
import { Link, Stack, Heading, Badge } from "@/components/base";

export const Brand = ({ small }: { small?: boolean }) => {
    const t = useI18n();

    return (
        <Link route="home">
            <Stack horizontal gap={ 0.5 }>
                <Heading fontSize={ small ? "lg" : "xl" }>
                    { t(config.appName) }
                </Heading>
                <Badge
                    fontSize={ small ? "xs" : "sm" }
                    textTransform="uppercase"
                >
                    { t("Beta") }
                </Badge>
            </Stack>
        </Link>
    );
};
