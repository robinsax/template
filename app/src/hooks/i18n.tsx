import React, {
    ReactNode, createContext, useMemo, useState, useContext, useRef
} from "react";

import en_US from "@common/locales/en_US.json";

// t("English")
const locales = {
    en_US: { messages: en_US, label: "English" }
};

export type I18nLocaleKey = keyof typeof locales;

export const supportedLocales = Object.keys(locales).map(key => ({
    key: key as I18nLocaleKey,
    label: locales[key as I18nLocaleKey].label
}));

export const supportedLocaleKeys: I18nLocaleKey[] = Object.keys(locales).map(key => (
    key as I18nLocaleKey
));

/**
*   The set of supported locale keys.
*/
export type I18nLocale = {
    key: I18nLocaleKey,
    label: string
};

type I18nContext = {
    locale: I18nLocaleKey,
    setLocale: (locale: I18nLocaleKey) => void,
    t: I18nFn
};

const i18nContext = createContext<I18nContext>(null as unknown as I18nContext);

/**
*   A function that translates messages to the current locale.
* 
*   All text presented in the UI must be passed to this.
* 
*   Messages may contain template variables using the format `{key}`, where `key` exists
*   in the given `vars` object.
*/
export type I18nFn = (
    message: string, vars?: Record<string, string | number> | null
) => string;

/**
*   A function that returns specific text using the provided {@link I18nFn}.
*
*   An additional parameter can be specified. 
*
*   This is used by convention in favor of passing raw strings to make it easier
*   to assert that translation is always occuring.
*/
export type I18nValueFn<P = never> = (
    [P] extends [never] ? (t: I18nFn) => string : (t: I18nFn, param: P) => string
);

/**
*   Provider for {@link useI18n}. Handles locale loading and implements `t`.
*/
export const I18nProvider = ({ children }: { children: ReactNode }) => {
    const [locale, setLocale] = useState<I18nLocaleKey>("en_US");

    const i18nWarns = useRef<Record<string, boolean>>({});

    const t = useMemo(() => {
        const translations = locales[locale].messages as Record<string, string>;

        const t = (
            message: string,
            vars?: Record<string, string | number> | null
        ) => {    
            if (message in translations) {
                message = translations[message];
            }
            else if (!i18nWarns.current[message]) {
                console.warn( // eslint-disable-line
                    "missing translation in", locale, ":", message
                );

                i18nWarns.current[message] = true;
            }

            if (!vars) return message;

            for (const key in vars) {
                const value = vars[key];
                message = message.replace(`{${key}}`, value + "");

                const plurals = new RegExp(`{${key}:(.*?):(.*?)}`, "g");
                message = message.replace(plurals, (_, p1, p2) => {
                    return (value as number) == 1 ? p1 : p2;
                });
            }

            return message;
        };

        return t;
    }, [locale]);

    return (
        <i18nContext.Provider value={ { locale, setLocale, t } }>
            {children}
        </i18nContext.Provider>
    );
};

/**
*   Returns a {@link I18nFn} with the current locale loaded.
*/
export const useI18n = (): I18nFn => useContext(i18nContext).t;
