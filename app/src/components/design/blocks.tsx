import React from "react";
import {
    HTMLChakraProps, Spinner, SpinnerProps, shouldForwardProp, chakra
} from "@chakra-ui/react";
import { get } from "@chakra-ui/utils";
import { isValidMotionProp } from "framer-motion";

export type ClickableProps<T extends "span" | "a"> = HTMLChakraProps<T> & {
    active?: boolean,
    disableActive?: boolean,
    activeColor?: string,
    presentation?: "underline" | "background"
};

const createClickable = <T extends "span" | "a">(type: T) => {
    return chakra<T, ClickableProps<T>>(type, {
        baseStyle: (props) => {
            const {
                theme,
                active = false,
                disableActive = false,
                activeColor = "primary.200",
                presentation = "underline"
            } = props as unknown as (
                ClickableProps<T> & { theme: Record<string, Record<string, unknown>> }
            );

            const resolvedColor = get(theme.colors, activeColor, activeColor);

            const bgRule = presentation == "background" ? activeColor : "transparent";
            const borderBottomRule = (
                presentation == "underline" ? `2px solid ${resolvedColor}` : "none"
            );

            return {
                display: "inline-block",
                cursor: !disableActive ? "pointer" : "inherit",
                bg: (active && !disableActive) ? bgRule : "transparent",
                borderBottom: (active && !disableActive) ? borderBottomRule : "none",
                _hover: {
                    bg: !disableActive ? bgRule : "transparent",
                    borderBottom: !disableActive ? borderBottomRule : "none"
                }
            };
        },
        shouldForwardProp: (prop) => (
            !["active", "disableActive", "activeColor", "asUnderline"].includes(prop) &&
            !isValidMotionProp(prop) &&
            shouldForwardProp(prop)
        )
    });
};

export const Clickable = createClickable("span");
export const ClickableLink = createClickable("a");

export const LoadIndicator = (props: SpinnerProps) => (
    <Spinner {...props}/>
);
