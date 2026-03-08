/**
*   Theme definition with related providers and hooks.
*/
import { ReactNode, useMemo } from "react";
import { Global, css } from "@emotion/react";

import { useQuery } from "./hooks";
import { queryLocalSettings } from "./state";

import "@fontsource/manrope";
import "@fontsource/ibm-plex-mono";
import "@fontsource-variable/playfair-display";

export const theme = {
    grid: [12, "px"],
    colors: {
        primary: ["#3c9ee0"],
        error: ["#db5838"],
        warning: ["#eddb3d"],
        success: ["#39d780"],
        background: ["#f5f5f5", "#222222"],
        offset: ["#e6e6e6", "#1a1a1a"],
        text: ["#333333", "#e6e6e6"],
        border: ["#cccccc", "#333333"],
        subtle: ["#999999", "#666666"]
    },
    shadows: {
        defaultDrop: [
            "0px 0px 5px 2px #00000011",
            "0px 0px 5px 2px #ffffff02"
        ],
        defaultInset: [
            "inset 0px 0px 5px 2px #00000011",
            "inset 0px 0px 5px 2px #ffffff02"
        ]
    },
    fonts: {
        body: ["Manrope, sans-serif"],
        heading: ["Playfair Display Variable, sans-serif"],
        mono: ["IBM Plex Mono, monospace"]
    },
    fontSizes: {
        xs: ["11px"],
        sm: ["12px"],
        md: ["14px"],
        lg: ["20px"],
        xl: ["30px"]
    },
    borders: {
        default: ["1px solid"],
        thick: ["4px solid"]
    }
};

type _Theme = typeof theme;
export type Theme = {
    color: keyof _Theme["colors"],
    shadow: keyof _Theme["shadows"],
    font: keyof _Theme["fonts"],
    fontSize: keyof _Theme["fontSizes"],
    border: keyof _Theme["borders"]
};

const writeVariables = (index: number) => {
    const group = (
        object: Record<string, string[]>, prefix: string, index: number
    ) => (
        Object.keys(object).map(key => (
            `--${ prefix }-${ key }: ${ object[key][index] || object[key][0] }`
        )).join(';\n') + ";"
    );

    return [
        group(theme.colors, 'c', index),
        group(theme.shadows, 's', index),
        group(theme.fonts, 'f', index),
        group(theme.fontSizes, 'fs', index),
        group(theme.borders, 'b', index)
    ].join('\n');
};

const baseStylesheet = css`
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

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
    }

    body {
        font-family: var(--f-body);
        font-size: var(--fs-md);
        color: var(--c-text);
        background-color: var(--c-background);
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
