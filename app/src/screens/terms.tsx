import { useI18n } from "@/hooks";
import { Heading, Text } from "@/components/base";
import { SplashScreen } from "@/components/global";

export default () => {
    const t = useI18n();

    return (
        <SplashScreen header>
            <Heading>
                { t("Terms of Service") }
            </Heading>
            <Text color="subtle">
                { t("Not authored yet.") }
            </Text>
        </SplashScreen>
    );
};
