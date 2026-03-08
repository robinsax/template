import { useI18n } from "@/hooks";
import { Heading, Stack, Text } from "@/components/base";
import { SplashScreen } from "@/components/global";

export default () => {
    const t = useI18n();

    return (
        <SplashScreen header>
            <Stack gap={ 0 } align="center">
                <Heading fontSize={ 10 }>
                    { t("404") }
                </Heading>
                <Text color="subtle" fontSize="sm">
                    { t("Page not found") }
                </Text>
            </Stack>
        </SplashScreen>
    );
};
