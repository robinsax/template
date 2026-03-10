import { useI18n, useQuery } from "@/hooks";
import { reroute } from "@/util";
import { queryCurrentUser } from "@/state";
import { Heading, Text } from "@/components/base";
import { SidebarScreen } from "@/components/global";

export default () => {
    const t = useI18n();

    const [user, working] = useQuery(queryCurrentUser);

    if (!working && !user) return reroute("home");
    return (
        <SidebarScreen>
            <Heading>{ t("Dashboard") }</Heading>
            <Text color="subtle">{ t("Not yet implemented.") }</Text>
        </SidebarScreen>
    );
};
