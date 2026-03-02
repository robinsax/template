import { I18nLocaleKey, MutationContext, supportedLocaleKeys } from "@/hooks";

export type LocalSettings = {
    sidebarCollapsed: boolean,
    locale: I18nLocaleKey
}

export const queryLocalSettings = (): LocalSettings => {
    const stored = localStorage.getItem("localSettings");

    if (stored) return JSON.parse(stored) as LocalSettings;

    return {
        sidebarCollapsed: false,
        locale: "en_US"
    };
};

export const mutateLocalSettings = (context: MutationContext, settings: Partial<LocalSettings>) => {
    const current = queryLocalSettings();
    const updated = { ...current, ...settings };

    localStorage.setItem("localSettings", JSON.stringify(updated));

    context.invalidate([queryLocalSettings]);
};

export const queryAuthToken = (): string | null => {
    return localStorage.getItem("authToken");
};

export const mutateAuthToken = (context: MutationContext, token: string | null) => {
    if (token) {
        localStorage.setItem("authToken", token);
    } else {
        localStorage.removeItem("authToken");
    }

    context.invalidate([]);
};
