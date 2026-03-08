import { useI18n } from "@/hooks";
import { Heading, Text } from "@/components/base";
import { SplashScreen } from "@/components/global";

export default () => {
    const t = useI18n();
    
    return (
        <SplashScreen header>
            <Heading>{ t("Home") }</Heading>
            <Text color="subtle">{ t("Not implemented yet.") }</Text>
        </SplashScreen>
    );
};
