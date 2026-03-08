/**
*   Branding UI.
*/
import config from "@/config";
import { useI18n } from "@/hooks";

import { Link, Stack, Heading, Badge } from "@/components/base";

export const Brand = ({ variant }: { variant?: "sm" | "lg" }) => {
    const t = useI18n();

    return (
        <Link href="home">
            <Stack horizontal gap={ 2 }>
                <Heading fontSize={ variant == "sm" ? "sm" : "lg" } fontWeight="bold">
                    { t(config.appName) }
                </Heading>
                <Badge fontSize={ variant == "sm" ? "xs" : "sm" }>
                    { t("Beta") }
                </Badge>
            </Stack>
        </Link>
    );
};
