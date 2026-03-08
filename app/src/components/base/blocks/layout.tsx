import { ReactNode } from "react";
import { jsx } from "@emotion/react";

import { I18nValueFn, useI18n } from "@/hooks";

import { BlockProps, BlockStyles, useBlockProps } from "./base";
import { Icon, IconName } from "./icons";

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
    const rawProps = useBlockProps(props, {
        fontFamily: "heading"
    });

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
    children, horizontal = false, justify = "start", align,
    ...props
}: BlockProps & {
    children?: ReactNode,
    horizontal?: boolean,
    justify?: "start" | "end" | "center" | "space-between",
    align?: "start" | "end" | "center" | "stretch" | "baseline"
}) => {
    align = align || (horizontal ? "center" : "start");

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
        backgroundColor: "primary",
        padding: 0.25,
        borderRadius: 0.25
    });

    return (
        <div { ...rawProps }>
            { children }
        </div>
    );
};

export const Alert = ({ children, type = "info", ...props }: BlockProps & {
    children?: ReactNode,
    type?: "error" | "warning" | "info" | "success"
}) => {
    const rawProps = useBlockProps(props, {
        padding: 1,
        width: "100%",
        border: "default",
        borderLeft: "thick",
        borderRadius: 0.25,
        borderColor: "border",
        backgroundColor: "offset",
        borderLeftColor: ({
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
    const rawProps = useBlockProps(props, {
        display: "flex",
        alignItems: "center",
        gap: 0.5
    });

    return (
        <label htmlFor={ forName } { ...rawProps }>
            { children }
            { required && <Box display="inline-block" color="error">*</Box> }
        </label>
    );
};

export const Card = ({ children, ...props }: BlockProps & {
    children?: ReactNode
}) => {
    const rawProps = useBlockProps(props, {
        border: "default",
        backgroundColor: "background",
        borderColor: "border",
        padding: 2,
        borderRadius: 0.5,
        boxShadow: "defaultDrop"
    });

    return (
        <div { ...rawProps }>
            { children }
        </div>
    );
};

export const Field = ({ name, required = false, label, icon, error, children }: {
    children?: ReactNode,
    name: string,
    label: I18nValueFn,
    required?: boolean,
    icon?: IconName,
    error?: I18nValueFn | null
}) => {
    const t = useI18n();

    return (
        <Stack width="100%" gap={ 0.5 }>
            <Label forName={ name } required={ required }>
                { icon && <Icon name={ icon } /> }
                { label(t) }
            </Label>
            { children }
            { error && (
                <Text color="error">
                    { error(t) }
                </Text>
            ) }
        </Stack>
    );
};
