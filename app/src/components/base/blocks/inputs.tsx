import {
    MouseEvent, KeyboardEvent, ChangeEvent, ReactNode, useCallback, useMemo
} from "react";
import { useNavigate } from "react-router-dom";

import { RouteKey, routes } from "@/routing";
import { I18nValueFn, useI18n } from "@/hooks";

import { BlockProps, BlockStyles, useBlockProps } from "./base";
import { ConditionalBlockProps, useConditionalProps } from "./conditions";
import { IconName, Icon, LoadIndicator } from "./icons";

export const Link = ({
    children, underlined, route, search, target, ...props
}: ConditionalBlockProps<HTMLAnchorElement> & {
    children: ReactNode,
    route: RouteKey,
    search?: Record<string, string>,
    underlined?: boolean,
    target?: "_blank" | "_self" | "_parent" | "_top"
}) => {
    const [visible, enabled, rest] = useConditionalProps(props);
    
    const rawProps = useBlockProps(rest, {
        color: "inherit",
        textDecoration: "none",
        borderBottom: underlined ? "default" : "none",
        borderColor: underlined ? "border" : "transparent",
        hover: underlined ? { borderColor: "primary" } : undefined
    }, [underlined]);

    const navigate = useNavigate();

    const url = useMemo(() => (
        routes[route] + (search ? "?" + new URLSearchParams(search).toString() : "")
    ), [route, search]);

    const onClick = useCallback((event: MouseEvent) => {
        event.preventDefault();

        navigate(url);
    }, [navigate, url]);

    return visible && (
        <a
            href={ enabled ? url : "" } target={ target }
            onClick={ onClick }
            { ...rawProps }
        >
            { children }
        </a>
    );
};

export const Button = ({
    children, onClick, working, ghost, active, icon, iconLeft, ...props
}: ConditionalBlockProps<HTMLDivElement> & {
    children?: ReactNode,
    working?: boolean,
    ghost?: boolean,
    active?: boolean,
    icon?: IconName,
    iconLeft?: boolean,
    onClick?: () => void
}) => {
    const [visible, enabled, rest] = useConditionalProps(props);

    const activeBackground = ghost ? "offset" : "primary";
    const rawProps = useBlockProps(rest, {
        display: "inline-flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "top",
        textAlign: "center",
        backgroundColor: active ? activeBackground : (ghost ? "transparent" : "offset"),
        border: ghost ? "none" : "default",
        borderColor: "border",
        cursor: enabled ? "pointer" : "not-allowed",
        paddingX: 1,
        paddingY: 0.5,
        borderRadius: 0.25,
        gap: 0.5,
        hover: {
            borderBottomColor: activeBackground
        }
    }, [enabled, ghost, active]);

    return visible && (
        <div
            onClick={ enabled ? onClick : undefined }
            { ...rawProps }
        >
            { working ? <>
                &nbsp;
                <LoadIndicator/>
                &nbsp;
            </> : <>
                { (icon && iconLeft) && <Icon name={ icon }/> }
                { children }
                { (icon && !iconLeft) && <Icon name={ icon }/> }
            </> }
        </div>
    );
};

export const Switch = ({ toggle, active, onChange, ...props }: (
    ConditionalBlockProps<HTMLDivElement>
) & {
    toggle?: BlockStyles,
    active?: boolean,
    onChange?: (active: boolean) => void
}) => {
    const [visible, enabled, rest] = useConditionalProps(props);
    
    const rawProps = useBlockProps(rest, {
        display: "inline-block",
        verticalAlign: "top",
        border: "default",
        backgroundColor: "offset",
        borderColor: "border",
        width: 3,
        height: 1.5,
        boxSizing: "content-box",
        borderRadius: 0.75,
        cursor: enabled ? "pointer" : "not-allowed"
    }, [enabled]);
    const toggleRawProps = useBlockProps(toggle || {}, {
        display: "inline-block",
        verticalAlign: "top",
        backgroundColor: "primary",
        width: 1.5,
        height: 1.5,
        marginLeft: active ? 1.5 : 0,
        borderRadius: 0.75,
        transition: "0.2s margin-left"
    }, [active]);

    return visible && (
        <div
            onClick={ (onChange && enabled) ? () => onChange(!active) : undefined }
            { ...rawProps }
        >
            <div { ...toggleRawProps } />
        </div>
    );
};

export const Input = <T extends number | string>({ 
    type = "text", value, invalid, name, placeholder, onChange, onEnter, ...props 
}: BlockProps<HTMLInputElement> & {
    type?: "text" | "password" | "number",
    name?: string,
    value?: T | null, 
    placeholder?: I18nValueFn,
    invalid?: boolean,
    onChange?: (value: T) => void,
    onEnter?: () => void
}) => {
    const t = useI18n();

    const rawProps = useBlockProps(props, {
        backgroundColor: "offset",
        color: "text",
        outline: "none",
        border: "default",
        borderColor: "border",
        borderBottomColor: invalid ? "error" : "border",
        borderRadius: 0.25,
        paddingX: 1, paddingY: 0.5,
        width: "100%",
        fontSize: "md",
        fontFamily: "body",
        focus: {
            borderBottomColor: invalid ? "error" : "primary"
        }
    }, [invalid]);

    const onChangeInner = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        if (onChange) onChange(event.target.value as T);
    }, [onChange]);

    const onKeyPress = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" && onEnter) onEnter();
    }, [onEnter]);

    return (
        <input
            type={ type }
            name={ name }
            value={ value ?? undefined }
            onChange={ onChangeInner }
            onKeyPress={ onKeyPress }
            placeholder={ placeholder ? placeholder(t) : undefined }
            { ...rawProps }
        />
    );
};

export const TextArea = ({ 
    value, name, placeholder, onChange, ...props 
}: BlockProps<HTMLTextAreaElement> & { 
    value?: string, 
    name?: string,
    placeholder?: I18nValueFn,
    onChange?: (value: string) => void 
}) => {
    const t = useI18n();

    const rawProps = useBlockProps(props, {
        display: "inline-block",
        verticalAlign: "top",
        backgroundColor: "subtle"
    });

    const onChangeInner = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        if (onChange) onChange(event.target.value);
    }, [onChange]);

    return (
        <textarea
            name={ name }
            value={ value }
            onChange={ onChangeInner }
            placeholder={ placeholder ? placeholder(t) : undefined }
            { ...rawProps }
        />
    );
};

export const Select = <T extends string>({ 
    value, name, options, onChange, ...props 
}: BlockProps<HTMLSelectElement> & { 
    value?: string, 
    name?: string,
    options: [T, I18nValueFn][],
    onChange?: (value: string) => void 
}) => {
    const t = useI18n();

    const rawProps = useBlockProps(props, {
        display: "inline-block",
        verticalAlign: "top",
        backgroundColor: "subtle"
    });

    const onChangeInner = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        if (onChange) onChange(event.target.value);
    }, [onChange]);

    return (
        <select
            name={ name }
            value={ value }
            onChange={ onChangeInner }
            { ...rawProps }
        >
            { options.map(([key, label]) => (
                <option key={ key } value={ key }>
                    { label(t) }
                </option>
            )) }
        </select>
    );
};
