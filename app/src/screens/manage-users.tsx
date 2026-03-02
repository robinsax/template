import React from "react";

import { InvalidationScope, useFetchedState } from "@/hooks";
import { UserManager } from "@/components/users";

export const ManageUsers = () => {
    const [users, invalidateUsers] = useFetchedState(api => api.users.get());

    return (
        <InvalidationScope
            invalidate={ invalidateUsers }
            queryKey="users"
        >
            <UserManager users={ users }/>
        </InvalidationScope>
    );
};

export default ManageUsers;