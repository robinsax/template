import {
    MouseEvent, KeyboardEvent, ChangeEvent, ReactNode, useCallback, useMemo,
    useState,
    useRef
} from "react";
import { useNavigate } from "react-router-dom";

import { RouteKey, routes } from "@/routing";
import { I18nValueFn, useI18n } from "@/hooks";

import { BlockProps, BlockStyles, useBlockProps } from "./base";
import { ConditionalBlockProps, useConditionalProps } from "./conditions";
import { IconName, Icon, LoadIndicator } from "./icons";
import { Popover } from "./popover";
import { Spacer } from "./layout";

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

const useDefaultInputStyles = (invalid?: boolean): BlockStyles => ({
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
});

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

    const defaultStyles = useDefaultInputStyles(invalid);

    const rawProps = useBlockProps(props, defaultStyles, [invalid]);

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

export const Select = <T extends string>({
    value, name, options, onChange, invalid, placeholder, ...props 
}: BlockProps & { 
    value?: string, 
    name?: string,
    invalid?: boolean,
    options: [T, I18nValueFn][],
    placeholder?: I18nValueFn,
    onChange?: (value: string) => void 
}) => {
    const t = useI18n();

    const defaultStyles = useDefaultInputStyles(invalid);

    const triggerRef = useRef<HTMLDivElement>(null);
    const [triggerWidth, setTriggerWidth] = useState(0);

    const rawProps = useBlockProps(props, {
        ...defaultStyles,
        width: "100%",
        cursor: "pointer",
        display: "flex",
        flexDirection: "row",
        alignItems: "center"
    }, [invalid]);

    const selectedOption = useMemo(() => (
        options.find(([key]) => key == value)
    ), [value, options]);

    const onOpen = useCallback(() => {
        if (!triggerRef.current) return;

        setTriggerWidth(triggerRef.current.getBoundingClientRect().width);
    }, []);

    return <>
        <input type="hidden" name={ name } value={ value }/>
        <Popover
            width="100%"
            onOpen={ onOpen }
            panelStyles={ {
                width: `${ triggerWidth }px`,
                paddingX: 0
            } }
            trigger={ () => (
                <div
                    { ...rawProps }
                    ref={ triggerRef }
                >
                    { selectedOption ? selectedOption[1](t) : (
                        placeholder ? placeholder(t) : t("Select one...")
                    ) }
                    <Spacer/>
                    <Icon name="down"/>
                </div>
            ) }
        >
            { options.map(([key, label]) => (
                <Button
                    key={ key }
                    ghost width="100%" justifyContent="flex-start"
                    active={ key == value }
                    borderRadius={ 0 }
                    borderLeft="thick"
                    borderLeftColor={ key == value ? "primary" : undefined }
                    onClick={ onChange && (() => onChange(key)) }
                >
                    { label(t) }
                </Button>
            )) }
        </Popover>
    </>;
};
