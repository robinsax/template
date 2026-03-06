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
import { Icon } from "./components/design/icons";

import "@fontsource/lexend";
import "@fontsource/manrope";
import "@fontsource/ibm-plex-mono";

// Chakra theme.
const force = (value: string) => value + " !important";

const boxShadow = "0px 0px 5px 2px #0000000d";

const semanticTokens = {
    colors: {
        // Selection colors.
        selection: {
            default: "primary.500",
        },
        error: {
            default: "red.500"
        },
        warning: {
            default: "yellow.500"
        },
        success: {
            default: "green.500"
        },
        // Text colors.
        themeText: {
            default: "gray.800",
            _dark: "gray.200"
        },
        lightText: {
            default: "gray.500"
        },
        // Border colors.
        border: {
            default: "gray.200",
            _dark: "gray.700"
        },
        // Background colors.
        primaryBg: {
            default: "gray.200",
            _dark: "gray.800"
        },
        offsetBg: {
            default: "gray.300",
            _dark: "gray.700"
        }
    },
    shadows: {
        light: "0px 0px 5px 2px #0000000d",
        selection: "0px 0px 5px 2px #D3B6A91a"
    }
};

const defaultInputVariant = {
    bg: "offsetBg",
    border: "1px solid",
    borderColor: "border"
};

const makeColorWeights = (color: string) => {
    const tc = new TinyColor(color);
    const scale: Record<number, string> = {};
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

    for (let i = 0; i < steps.length; i++) {
        const amount = (i - 4);
        let sc = tc.clone();

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
        primary: makeColorWeights("#3c9ee0"),
        red: makeColorWeights("#db5838"),
        green: makeColorWeights("#39d780"),
        blue: makeColorWeights("#3c9ee0"),
        yellow: makeColorWeights("#eddb3d")
    },
    styles: {
        global: {
            // Remove default Chakra outlines.
            '*:focus, [aria-expanded="true"]': {
                boxShadow: force("none"),
                outline: force("none"),
            },
            // Default styles.
            "body": {
                overflowY: force("hidden"),
                color: "themeText",
                bg: "primaryBg"
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
                    bg: "offsetBg"
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
            variants: {
                solid: {
                    bg: "offsetBg",
                    transition: "none",
                    _hover: {
                        bg: "primary.500"
                    }
                }
            }
        },
        Divider: {
            baseStyle: {
                borderColor: "border"
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
        Popover: {
            baseStyle: (props: StyleFunctionProps) => ({
                content: {
                    borderColor: "border",
                    boxShadow: force(boxShadow),
                    bg: (
                        props.colorMode == "dark" ?
                            "#1d1d1d" : "#ffffff"
                    )
                },
                arrow: {
                    backgroundColor: (
                        props.colorMode == "dark" ?
                            force("#1d1d1d") : force("#ffffff")
                    )
                }
            })
        }
    }
});

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
                        <Box mt={ 0.25 }>
                            <Icon name="info" size={ 1 }/>
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
                        semanticTokens.colors.offsetBg.default
                    } !important;
                    color: ${ semanticTokens.colors.themeText.default } !important;
                    backdrop-filter: blur(0px) !important;
                }
                .chakra-toast__inner > *[data-status="error"] {
                    background-color: ${ theme.colors.red[500] } !important;
                }
                .chakra-toast__inner > *[data-status="warning"] {
                    background-color: ${ theme.colors.yellow[500] } !important;
                }
                .chakra-toast__inner > *[data-status="success"] {
                    background-color: ${ theme.colors.green[500] } !important;
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
