import { useI18n } from "@/hooks";
import { Heading, Text } from "@/components/base";
import { SidebarScreen } from "@/components/global";

export default () => {
    const t = useI18n();
    return (
        <SidebarScreen>
            <Heading>{ t("Dashboard") }</Heading>
            <Text color="subtle">{ t("Not yet implemented.") }</Text>
        </SidebarScreen>
    );
};
