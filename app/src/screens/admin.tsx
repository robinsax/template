import { useI18n } from "@/hooks";
import { Heading } from "@/components/base";
import { SidebarScreen } from "@/components/global";

export default () => {
    const t = useI18n();
    
    return (
        <SidebarScreen>
            <Heading>{ t('Admin') }</Heading>
        </SidebarScreen>
    );
};
