import { ReactNode } from "react";
import { jsx } from "@emotion/react";

import { BlockProps, BlockStyles, useBlockProps } from "./base";

export const Box = ({ children, ...props }: BlockProps & {
    children?: ReactNode
}) => {
    const rawProps = useBlockProps(props);

    return (
        <div { ...rawProps }>
            { children }
        </div>
    );
};

export const Text = ({ children, ...props }: BlockProps<HTMLParagraphElement> & {
    children?: ReactNode
}) => {
    const rawProps = useBlockProps(props);

    return (
        <p { ...rawProps }>
            { children }
        </p>
    );
};

export const Heading = ({
    children, level = 1, ...props
}: BlockProps<HTMLHeadingElement> & {
    children?: ReactNode,
    level?: 1 | 2 | 3 | 4 | 5 | 6
}) => {
    const rawProps = useBlockProps(props);

    return jsx(
        `h${level}`,
        rawProps,
        children
    );
};

const prefixStackAlign = (value: string) => (
    value == "start" || value == "end" ? "flex-" + value : value
);

export const Stack = ({
    children, horizontal = false, justify = "start", align = "center",
    ...props
}: BlockProps & {
    children?: ReactNode,
    horizontal?: boolean,
    justify?: "start" | "end" | "center" | "space-between",
    align?: "start" | "end" | "center" | "stretch" | "baseline"
}) => {
    const rawProps = useBlockProps(props, {
        display: "flex",
        flexDirection: horizontal ? "row" : "column",
        justifyContent: prefixStackAlign(justify) as BlockStyles["justifyContent"],
        alignItems: prefixStackAlign(align) as BlockStyles["alignItems"],
        gap: 1
    }, [horizontal, justify, align]);

    return (
        <div { ...rawProps }>
            { children }
        </div>
    );
};

export const Spacer = () => {
    return (
        <div css={ { flex: 1 } }/>
    );
};

export const Badge = ({ children, ...props }: BlockProps & {
    children?: ReactNode
}) => {
    const rawProps = useBlockProps(props, {
        display: "inline-block",
        verticalAlign: "top",
        backgroundColor: "primary"
    });

    return (
        <div { ...rawProps }>
            { children }
        </div>
    );
};

export const LoadIndicator = () => {
    return (
        <div css={ { display: "inline-block" } }>
            ...
        </div>
    );
};

export const Alert = ({ children, type = "info", ...props }: BlockProps & {
    children?: ReactNode,
    type?: "error" | "warning" | "info" | "success"
}) => {
    const rawProps = useBlockProps(props, {
        padding: 2,
        backgroundColor: ({
            error: "error",
            warning: "warning",
            info: "primary",
            success: "success"
        } as const)[type]
    }, [type]);

    return (
        <div { ...rawProps }>
            { children }
        </div>
    );
};

export const Label = ({
    children, forName, required = false, ...props 
}: BlockProps<HTMLLabelElement> & {
    forName?: string,
    required?: boolean,
    children?: ReactNode
}) => {
    const rawProps = useBlockProps(props);

    return (
        <label htmlFor={ forName } { ...rawProps }>
            { children }
            { required && <Box display="inline-block" color="error">*</Box> }
        </label>
    );
};
