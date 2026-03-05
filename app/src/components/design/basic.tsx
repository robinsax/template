import React from "react";
import {
    HTMLChakraProps, Spinner, SpinnerProps, shouldForwardProp, chakra
} from "@chakra-ui/react";
import { isValidMotionProp } from "framer-motion";

export type ClickableProps<T extends "span" | "a"> = (
    HTMLChakraProps<T> &
    { active?: boolean, disableActive?: boolean, activeColor?: string }
);

const createClickable = <T extends "span" | "a">(type: T) => {
    return chakra<T, ClickableProps<T>>(type, {
        baseStyle: (props) => {
            const {
                active, disableActive, activeColor = "red.500"
            } = props as unknown as ClickableProps<T>;

            return {
                display: "inline-block",
                cursor: !disableActive ? "pointer" : "inherit",
                bg: (
                    (active && !disableActive) ? activeColor : "transparent"
                ),
                borderRadius: "md",
                _hover: {
                    backgroundColor: !disableActive ? activeColor : "transparent"
                }
            };
        },
        shouldForwardProp: (prop) => (
            !["active", "disableActive", "activeColor"].includes(prop) &&
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
