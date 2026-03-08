import { I18nLocaleKey } from "@/hooks";

import { MutationContext } from "./base";

export type LocalSettings = {
    sidebarCollapsed: boolean,
    darkTheme: boolean,
    locale: I18nLocaleKey
};

export const queryLocalSettings = (): LocalSettings => {
    const stored = localStorage.getItem("localSettings");

    if (stored) return JSON.parse(stored) as LocalSettings;

    return {
        sidebarCollapsed: false,
        darkTheme: false,
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
