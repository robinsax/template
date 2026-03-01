/**
*   Theme definition with related providers and hooks.
*/
import React, { ReactNode, useMemo } from "react";
import {
    Box, ColorModeScript, StyleFunctionProps, extendTheme, useColorMode
} from "@chakra-ui/react";
import { SaasProvider } from "@saas-ui/react";
import { theme as saasTheme } from "@saas-ui/theme";
import { TinyColor } from "@ctrl/tinycolor";

// Specific to prevent circular import.
import { Icon } from "./components/common/icons";

import "@fontsource/lexend";
import "@fontsource/manrope";
import "@fontsource/ibm-plex-mono";

/**
*   Generator for the vignette gradients. Pass the current time as `t` to animate.
*/
export const vignetteGenerator = (t: number, dark: boolean) => {
    const p = (Math.sin(t) + 1) * 0.5;
    const q = 1 - p;

    const c1o = 0.9 * p;
    const c2o = 0.9 * q;
    const c3o = 0.6 * p;

    const g1d = (0.3 + (0.3 * p)) * 100;
    const g2d = (0.15 + (0.15 * q)) * 100;

    const colors = [
        `rgba(255, 220, 128, ${ c1o })`,
        `rgba(44, 165, 177, ${ c2o })`,
        `rgba(251, 148, 115, ${ c3o })`
    ];

    const gradients = [
        `linear-gradient(to top right, ${ colors[0]} 0%, transparent ${ g1d }%)`,
        `linear-gradient(to bottom right, ${ colors[1]} 0%, transparent ${ g2d }%)`,
        `linear-gradient(to left, ${ colors[2]}, transparent 60%)`
    ];

    return [
        "background-image: " + gradients.join(", "),
        "opacity: " + (dark ? 0.2 : 0.7),
        ""
    ].join(";");
};

// Chakra theme.
const force = (value: string) => value + " !important";

const backdropFilter = "blur(10px) saturate(50%)";
const boxShadow = "0px 0px 5px 2px #0000000d";
const primaryColor = "#D3B6A980";

const semanticTokens = {
    colors: {
        // Selection colors.
        selection: {
            default: primaryColor,
        },
        selectionOpaque: {
            default: "#D3B6A9ff",
        },
        lightSelection: {
            default: "#d3b6a947"
        },
        error: {
            default: "#fb8e7280"
        },
        errorOpaque: {
            default: "#fb8e72ff",
        },
        success: {
            default: "#4bc8a780"
        },
        successOpaque: {
            default: "#4bc8a7ff",
        },
        // Text colors.
        themeText: {
            default: "#10131E",
            _dark: "#FCFCFC"
        },
        themeTextSofter: {
            default: "#1c1c1ce6",
            _dark: "#e0e0e0e3"
        },
        lightText: {
            default: "#939499"
        },
        // Border colors.
        lightBorder: {
            default: "#0000001a",
            _dark: "#ffffff1a"
        },
        dndTarget: {
            default: "#FFDE80",
        },
        // Map colors.
        mapSelection: {
            default: "#239CF3",
        },
        mapLand: {
            default: "#e5e7ed",
            _dark: "#7d7f83"
        },
        mapFeature: {
            default: "#dddfe5",
            _dark: "#cccccc"
        },
        mapPanelBg: {
            default: "#f1f3f8",
            _dark: "#1c1e20"
        },
        // Background colors.
        offsetBg: {
            default: "gray.200",
            _dark: "gray.900"
        },
        offsetBgSofter: {
            default: "gray.300",
            _dark: "gray.700"
        },
        warningBg: {
            default: "#FFDE80cc"
        },
        panelBg: {
            default: "#ffffff80",
            _dark: "#00000033"
        },
        panelBgVariantA: {
            default: "#ffffff4d",
            _dark: "#00000066",
        },
        panelBgVariantB: {
            default: "#ffffffb3",
            _dark: "#ffffff1a",
        },
        insetPanelBg: {
            default: "#0000001a",
            _dark: "#00000033",
        },
        insetPanelBgVariantA: {
            default: "#0000000d",
            _dark: "#0000001a",
        },
        insetPanelBgVariantB: {
            default: "#00000033",
            _dark: "#0000004d",
        }
    },
    shadows: {
        raise: "0px 0px 5px 2px #0000000d",
        selection: "0px 0px 5px 2px #D3B6A91a"
    }
};

const defaultInputVariant = {
    bg: "insetPanelBgVariantA",
    border: force("1px solid #9898981a")
};

const panelBaseStyles = (
    props: StyleFunctionProps,
    lightVariant: keyof typeof semanticTokens.colors = "panelBg"
) => ({
    bg: (
        props.colorMode == "dark" ?
            semanticTokens.colors.panelBg._dark : lightVariant
    ),
    backdropFilter
});

const makeColorWeights = (color: string, desat: number = 25) => {
    const tc = new TinyColor(color);
    const scale: Record<number, string> = {};
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

    for (let i = 0; i < steps.length; i++) {
        const amount = (i - 3) * 5;
        let sc = tc.clone().desaturate(desat);

        if (amount < 0) sc = sc.lighten(-amount);
        else sc = sc.darken(amount * 2);

        scale[steps[i]] = sc.toHexString();
    }

    return scale;
};

const theme = extendTheme(saasTheme, {
    config: {
        useSystemColorMode: true
    },
    semanticTokens,
    fonts: {
        heading: "Lexend, sans-serif",
        body: "Manrope, sans-serif",
        mono: "IBM Plex Mono, monospace"
    },
    colors: {
        primary: makeColorWeights(primaryColor),
        red: makeColorWeights("#FB8E72", 50),
        green: makeColorWeights("#4BC8A7", 10),
        blue: makeColorWeights("#239CF3"),
        yellow: makeColorWeights("#FFDE80", 50)
    },
    styles: {
        global: {
            // Remove default Chakra outlines.
            '*:focus, [aria-expanded="true"]': {
                boxShadow: force("none"),
                outline: force("none"),
            },
            "body": {
                overflowY: force("hidden")
            },
            // Global scroll policy.
            ".saas-app-shell__main": {
                minWidth: force("950px")
            },
            // Prevent autofill styles.
            "input:-webkit-autofill, input:-webkit-autofill:focus": {
                color: force("black")
            },
            '[data-theme="dark"] input:-webkit-autofill, [data-theme="dark"] input:-webkit-autofill:focus': { // eslint-disable-line
                color: force("white")
            },
            // Override default hover effects.
            "&[data-active]": {
                backgroundColor: force(semanticTokens.colors.insetPanelBg.default)
            },
            '[data-theme="dark"] &[data-active]': {
                backgroundColor: force(semanticTokens.colors.insetPanelBg._dark)
            },
            ".sui-nav-item__link:hover": {
                backgroundColor: force(
                    semanticTokens.colors.insetPanelBgVariantA.default
                )
            },
            '[data-theme="dark"] .sui-nav-item__link:hover': {
                backgroundColor: force(
                    semanticTokens.colors.insetPanelBgVariantA._dark
                )
            },
            // Override menu styles (SaaSUI <select>).
            ".chakra-menu__menu-list": {
                backgroundColor: force(
                    semanticTokens.colors.panelBg.default
                ),
                backdropFilter
            },
            ".chakra-menu__menuitem-option": {
                backgroundColor: force(
                    semanticTokens.colors.insetPanelBgVariantA.default
                ),
                backdropFilter
            },
            [".chakra-menu__menuitem-option:hover," +
            '.chakra-menu__menuitem-option[aria-checked="true"]']: {
                backgroundColor: force("transparent")
            },
            '[data-theme="dark"] .chakra-menu__menu-list': {
                backgroundColor: force(
                    semanticTokens.colors.panelBg._dark
                ),
                backdropFilter
            }
        }
    },
    components: {
        Alert: {
            baseStyle: {
                container: {
                    fontSize: "sm",
                    backgroundOpacity: 0.5
                }
            }
        },
        Badge: {
            baseStyle: (props: StyleFunctionProps) => {
                const { colorScheme, colorMode } = props;

                return {
                    bg: colorScheme + (colorMode == "dark" ? ".500" : ".200"),
                    color: colorScheme + (colorMode == "dark" ? ".50" : ".600")
                };
            }
        },
        Switch: {
            baseStyle: {
                track: {
                    bg: "insetPanelBg",
                    backdropFilter
                }
            }
        },
        Text: {
            variants: {
                light: {
                    color: "lightText",
                    fontSize: "xs"
                }
            }
        },
        Button: {
            baseStyle: {
                transition: "all 0.1s ease-in-out",
                _hover: {
                    transform: "scale(1.02)"
                }
            },
            variants: {
                solid: {
                    bg: "selection",
                    backdropFilter,
                    _hover: {
                        bg: "selection"
                    }
                },
                primary: {
                    bg: "offsetBg",
                    color: "themeText",
                    backdropFilter,
                    _hover: {
                        bg: "selection"
                    }
                },
                cta: {
                    bg: "panelBg",
                    color: "themeText",
                    fontSize: "lg",
                    p: 3,
                    height: "auto",
                    backdropFilter,
                    _hover: {
                        bg: "selection"
                    },
                    boxShadow: "raise"
                }
            }
        },
        Divider: {
            baseStyle: {
                borderColor: "lightBorder"
            }
        },
        Input: {
            variants: {
                outline: {
                    field: defaultInputVariant
                },
                flushed: {
                    field: {
                        borderColor: "lightText"
                    }
                }
            }
        },
        Select: {
            variants: {
                outline: {
                    field: defaultInputVariant
                }
            }
        },
        Textarea: {
            variants: {
                outline: defaultInputVariant
            }
        },
        Card: {
            baseStyle: (props: StyleFunctionProps) => ({
                container: {
                    ...panelBaseStyles(props),
                    borderStyle: "solid",
                    borderWidth: 1,
                    borderColor: "lightBorder"
                }
            })
        },
        Modal: {
            baseStyle: (props: StyleFunctionProps) => ({
                dialog: panelBaseStyles(props, "panelBgVariantB")
            })
        },
        Tooltip: {
            baseStyle: (props: StyleFunctionProps) => ({
                ...panelBaseStyles(props),
                borderRadius: "md",
                zIndex: 5000
            })
        },
        Popover: {
            baseStyle: (props: StyleFunctionProps) => ({
                content: {
                    ...panelBaseStyles(props),
                    borderColor: "lightBorder",
                    boxShadow: force(boxShadow),
                    bg: props.colorMode == "dark" ?
                        "#1d1d1dbf" : "#ffffffb3"
                },
                arrow: {
                    backgroundColor: props.colorMode == "dark" ?
                        "#1d1d1dbf !important"
                    :
                        "#ffffffb3 !important"
                }
            })
        }
    }
});

// Compute toast backgrounds.
const errorToastBg = (
    makeColorWeights(semanticTokens.colors.error.default, 50)[200] + "d0"
);
const successToastBg = (
    makeColorWeights(semanticTokens.colors.success.default, 20)[200] + "d0"
);
const warningToastBg = (
    makeColorWeights(semanticTokens.colors.dndTarget.default, 20)[200] + "d0"
);

/**
*   Theme provider mounted at the app root.
*/
export const ThemedRoot = ({ children }: { children: ReactNode }) => {
    return (
        <SaasProvider
            theme={ theme }
            toastOptions={ {
                defaultOptions: {
                    icon: (
                        <Box mt="0.25rem">
                            <Icon name="info" size="1rem"/>
                        </Box>
                    ),
                    position: "top",
                    duration: 5000,
                    isClosable: true
                }
            } }
        >
            { /* This is the only way to style toasts that I could find... */ }
            <style>{ `
                .chakra-toast__inner > * {
                    background-color: ${
                        semanticTokens.colors.panelBg.default
                    } !important;
                    color: ${ semanticTokens.colors.themeText.default } !important;
                    backdrop-filter: blur(0px) !important;
                }
                .chakra-toast__inner > *[data-status="error"] {
                    background-color: ${ errorToastBg } !important;
                }
                .chakra-toast__inner > *[data-status="warning"] {
                    background-color: ${ warningToastBg } !important;
                }
                .chakra-toast__inner > *[data-status="success"] {
                    background-color: ${ successToastBg } !important;
                }
                .chakra-alert__icon {
                    color: ${ semanticTokens.colors.themeText.default } !important;
                }
            ` }</style>
            <Box height="100vh" width="full">
                <ColorModeScript initialColorMode={ theme.config.initialColorMode }/>
                { children }
            </Box>
        </SaasProvider>
    );
};

/**
*   Returns a style object that fixes a dark theme bug in Chakra for panel backgrounds.
*
*   Use as:
*   ```tsx
*   const styles = usePanelStylesFix();
* 
*   // ...
* 
*   <Box {...styles}>
*   ```
*/
export const usePanelStylesFix = (lowOpacity?: boolean) => {
    const { colorMode } = useColorMode();

    const convertValue = (value: string) => {
        if (lowOpacity) return value.replace(/, [0-9.]+?\)/, ", 0.35)");
        return value;
    };

    return useMemo(() => {
        return {
            sx: {
                background: convertValue(
                    colorMode == "dark" ?
                        semanticTokens.colors.panelBg._dark
                    :
                        semanticTokens.colors.panelBg.default
                ) + " !important"
            },
            backdropFilter
        };
    }, [colorMode]);
};

/**
*   The set of color keys defined in the theme.
*/
export type ThemeColor = keyof typeof semanticTokens.colors;

/**
*   Returns the corresponding color for the given `themeKey` as a hex or rgba() string.
*/
export const useThemeColor = (themeKey: ThemeColor) => {
    const { colorMode } = useColorMode();

    return useMemo(() => {
        return (
            colorMode == "dark" ?
                "_dark" in semanticTokens.colors[themeKey] ?
                    semanticTokens.colors[themeKey]._dark
                :
                    semanticTokens.colors[themeKey].default
            :
                semanticTokens.colors[themeKey].default
        ) as string;
    }, [colorMode, themeKey]);
};

/**
*   Returns a style object that makes the element grow on hover.
*/
export const useGrowOnHover = () => {
    return useMemo(() => {
        return {
            transition: "all 0.1s ease-in-out",
            _hover: {
                transform: "scale(1.03) translateZ(0)",
                willChange: "transform"
            }
        };
    }, []);
};

export const useBoxShadow = () => {
    return boxShadow;
};

export const useDarkTheme = () => {
    const { colorMode } = useColorMode();

    return colorMode == "dark";
};

export const useHideScrollbars = () => {
    return useMemo(() => {
        return {
            sx: {
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
                msOverflowStyle: "none",
            }
        };
    }, []);
};
