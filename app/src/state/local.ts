import { I18nLocaleKey } from "@/hooks";

import { MutationContext } from "./base";
import { AuthParams } from "@/model";

export type LocalSettings = {
    sidebarCollapsed: boolean,
    locale: I18nLocaleKey
};

export const queryLocalSettings = (): LocalSettings => {
    const stored = localStorage.getItem("localSettings");

    if (stored) return JSON.parse(stored) as LocalSettings;

    return {
        sidebarCollapsed: false,
        locale: "en_US"
    };
};

export const mutateLocalSettings = (
    context: MutationContext, settings: Partial<LocalSettings>
) => {
    const current = queryLocalSettings();
    const updated = { ...current, ...settings };

    localStorage.setItem("localSettings", JSON.stringify(updated));

    context.invalidate(queryLocalSettings);
};

export type StoredAuthState = {
    token: string,
    userId: string
};

export const queryAuthState = (): StoredAuthState | null => {
    if (!localStorage.hasItem("authState")) return null;

    return JSON.parse(localStorage.getItem("authState") as string);
};

export const mutateAuthState = (
    context: MutationContext, newState: StoredAuthState | null
) => {
    if (newState) {
        localStorage.setItem("authState", JSON.stringify(newState));
    } else {
        localStorage.removeItem("authState");
    }

    context.invalidate(queryAuthState);
};

export const mutateAuthStateLogIn = async (
    context: MutationContext, creds: Omit<AuthParams, "restriction">
) => {
    const resp = await context.api.auth.post({
        ...creds,
        restriction: null
    });

    mutateAuthState(context, {
        token: resp.token,
        userId: resp.auth.user_id
    });
};
