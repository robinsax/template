import {
    UserGrantModel, UserGrantClientModel, UserGrantBusinessModel, AuthzScope
} from "@/model";

import { grantContainsScope } from "./util";

describe("Authorization awareness logic", () => {
    const globalAuthzScope: AuthzScope = {
        clientId: null,
        businessId: null
    };
    const clientAAuthzScope: AuthzScope = {
        clientId: "c1",
        businessId: null
    };
    const businessAAuthzScope: AuthzScope = {
        clientId: "c1",
        businessId: "b1"
    };
    const businessBAuthzScope: AuthzScope = {
        clientId: "c2",
        businessId: "b2"
    };

    const globalAdminGrant: UserGrantModel = {
        id: "1",
        user_id: "1",
        role: "admin",
        scope_type: "global",
        client_id: null,
        business_id: null,
        client: null,
        business: null
    };
    const clientAAccountManagerGrant: UserGrantModel = {
        id: "2",
        user_id: "1",
        role: "account_manager",
        scope_type: "client",
        client_id: "c1",
        business_id: null,
        client: { id: "c1" } as unknown as UserGrantClientModel,
        business: null
    };
    const businessAMemberGrant: UserGrantModel = {
        id: "4",
        user_id: "1",
        role: "member",
        scope_type: "business",
        client_id: "c1",
        business_id: "b1",
        client: { id: "c1" } as unknown as UserGrantClientModel,
        business: { id: "b1", client_id: "c1" } as unknown as UserGrantBusinessModel
    };

    it("should understand scope hierarchy", () => {
        const expectContains = (grant: UserGrantModel, scope: AuthzScope) => {
            expect(grantContainsScope(grant, scope)).toBe(true);
        };
        const expectNotContains = (grant: UserGrantModel, scope: AuthzScope) => {
            expect(grantContainsScope(grant, scope)).toBe(false);
        };

        expectContains(globalAdminGrant, globalAuthzScope);
        expectContains(globalAdminGrant, clientAAuthzScope);
        expectNotContains(clientAAccountManagerGrant, globalAuthzScope);
        expectContains(clientAAccountManagerGrant, businessAAuthzScope);
        expectNotContains(clientAAccountManagerGrant, businessBAuthzScope);
        expectNotContains(businessAMemberGrant, globalAuthzScope);
        expectContains(businessAMemberGrant, businessAAuthzScope);
        expectNotContains(businessAMemberGrant, businessBAuthzScope);
        expectNotContains(businessAMemberGrant, clientAAuthzScope);
    });
});
