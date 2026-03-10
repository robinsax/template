import { useI18n, useQuery } from "@/hooks";
import { queryCurrentUser } from "@/state";
import { reroute } from "@/util";
import { Heading, Stack } from "@/components/base";
import { SidebarScreen } from "@/components/global";
import { UserAdminList } from "@/components/users";

export default () => {
    const t = useI18n();
    
    const [user, working] = useQuery(queryCurrentUser);

    if (!working && !user) return reroute("home");

    return (
        <SidebarScreen>
            <Stack width="100%">
                <Heading>{ t('Admin') }</Heading>
                <UserAdminList/>
            </Stack>
        </SidebarScreen>
    );
};
