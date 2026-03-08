/**
*   Theme definition with related providers and hooks.
*/
import { ReactNode, useMemo } from "react";
import { Global, css } from "@emotion/react";

import { useQuery } from "./hooks";
import { queryLocalSettings } from "./state";

import "@fontsource/lexend";
import "@fontsource/manrope";
import "@fontsource/ibm-plex-mono";

export const theme = {
    grid: [1, "rem"],
    colors: {
        primary: ["#3c9ee0"],
        error: ["#db5838"],
        warning: ["#eddb3d"],
        success: ["#39d780"],
        background: ["#e6e6e6", "#333333"],
        text: ["#333333", "#e6e6e6"],
        border: ["#cccccc"],
        subtle: ["#999999", "#666666"]
    },
    shadows: {
        normalDrop: ["0px 0px 5px 2px #0000000d"]
    },
    fonts: {
        body: ["Manrope, sans-serif"],
        heading: ["Lexend, sans-serif"],
        mono: ["IBM Plex Mono, monospace"]
    },
    fontSizes: {
        xs: ["0.75rem"],
        sm: ["0.875rem"],
        md: ["1rem"],
        lg: ["2rem"],
        xl: ["3rem"]
    }
};

type _Theme = typeof theme;
export type Theme = {
    color: keyof _Theme["colors"],
    shadow: keyof _Theme["shadows"],
    font: keyof _Theme["fonts"],
    fontSize: keyof _Theme["fontSizes"]
};

const writeVariables = (index: number) => {
    const group = (
        object: Record<string, string[]>, prefix: string, index: number
    ) => (
        Object.keys(object).map(key => (
            `--${ prefix }-${ key }: ${ object[key][index] || object[key][0] }`
        )).join('\n')
    );

    return [
        group(theme.colors, 'c', index),
        group(theme.shadows, 's', index),
        group(theme.fonts, 'f', index),
        group(theme.fontSizes, 'fs', index)
    ].join('\n');
};

const baseStylesheet = css`
    body {
        ${ writeVariables(0) }
    }
    body[data-theme="dark"] {
        ${ writeVariables(1) }
    }

    * {
        box-sizing: border-box;
        margin: 0px;
        padding: 0px;
        border-color: var(--c-border);
    }

    body {
        font-family: var(--f-body);
        font-size: var(--fs-md);
        color: var(--c-text);
        background-color: var(--c-background);
    }

    h1, h2, h3, h4, h5, h6 {
        font-family: var(--f-heading);
    }
`;

export const ThemeRoot = ({ children }: { children: ReactNode }) => {
    const [localSettings] = useQuery(queryLocalSettings);

    useMemo(() => {
        if (localSettings && localSettings.darkTheme) {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
    }, [localSettings]);

    return (
        <>
            <Global styles={ baseStylesheet }/>
            { children }
        </>
    );
};

export const useThemeColor = (color: Theme["color"]) => {
    const [localSettings] = useQuery(queryLocalSettings);

    return useMemo(() => {
        const index = localSettings && localSettings.darkTheme ? 1 : 0;

        return theme.colors[color][index] || theme.colors[color][0];
    }, [localSettings, color]);
};
