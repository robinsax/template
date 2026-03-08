import { MouseEvent, ChangeEvent, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { Permission, RealmModel } from "@/model";
import { RouteKey } from "@/routing";
import { I18nValueFn, useAuthzCheck, useI18n } from "@/hooks";

import { BlockProps, BlockStyles, useBlockProps } from "./base";
import { LoadIndicator } from "./layout";
import { useEnableState } from "./enable-state";

export type ConditionalProps = {
    enableState?: string,
    permission?: Permission | Permission[],
    realm?: RealmModel | null,
    showDisabled?: boolean
};

const useConditionalProps = <T extends ConditionalProps>(props: T) => {
    const { enableState, permission, realm, showDisabled, ...rest } = props;
    
    const isEnabled = useEnableState(enableState || null);
    const isAllowed = useAuthzCheck(realm || null, permission || null);

    const enabled = isEnabled && isAllowed;
    const visible = !enabled && showDisabled;

    return [visible, enabled, rest] as const;
};

export type DynamicProps<T = HTMLDivElement> = BlockProps<T> & ConditionalProps;

export const DynamicBox = ({ children, ...props }: DynamicProps & {
    children: ReactNode
}) => {
    const [visible, _, rest] = useConditionalProps(props);
    
    const rawProps = useBlockProps(rest);
    
    return visible && (
        <div { ...rawProps }>
            { children }
        </div>
    );
};

export const Link = ({
    children, href, target, ...props
}: DynamicProps<HTMLAnchorElement> & {
    children: ReactNode,
    href: RouteKey,
    target?: "_blank" | "_self" | "_parent" | "_top",
    access?: string | null
}) => {
    const [visible, enabled, rest] = useConditionalProps(props);
    
    const rawProps = useBlockProps(rest, {
        color: "inherit",
        textDecoration: "none"
    });

    const navigate = useNavigate();

    const onClick = useCallback((event: MouseEvent) => {
        event.preventDefault();

        navigate(href);
    }, [navigate, href]);

    return visible && (
        <a
            href={ enabled ? href : "" } target={ target }
            onClick={ onClick }
            { ...rawProps }
        >
            { children }
        </a>
    );
};

export const Button = ({ children, onClick, working, ...props }: DynamicProps & {
    children?: ReactNode,
    working?: boolean,
    onClick?: () => void
}) => {
    const [visible, enabled, rest] = useConditionalProps(props);

    const rawProps = useBlockProps(rest, {
        display: "inline-block",
        verticalAlign: "top",
        backgroundColor: "primary",
        cursor: enabled ? "pointer" : "not-allowed",
        hover: {
            boxShadow: "normalDrop"
        }
    }, [enabled]);

    return visible && (
        <div
            onClick={ enabled ? onClick : undefined }
            { ...rawProps }
        >
            { working ? <LoadIndicator/> : children }
        </div>
    );
};

export const Switch = ({ toggle, active, onChange, ...props }: DynamicProps & {
    toggle?: BlockStyles,
    active?: boolean,
    onChange?: (active: boolean) => void
}) => {
    const [visible, enabled, rest] = useConditionalProps(props);
    
    const rawProps = useBlockProps(rest, {
        display: "inline-block",
        verticalAlign: "top",
        backgroundColor: "subtle",
        width: 4,
        height: 2,
        cursor: enabled ? "pointer" : "not-allowed"
    }, [enabled]);
    const toggleRawProps = useBlockProps(toggle || {}, {
        display: "inline-block",
        verticalAlign: "top",
        backgroundColor: "primary",
        width: 2,
        height: 2,
        left: active ? 2 : 0
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
    type = "text", value, name, placeholder, onChange, ...props 
}: BlockProps<HTMLInputElement> & {
    type?: "text" | "password" | "number",
    name?: string,
    value?: T | null, 
    placeholder?: I18nValueFn,
    onChange?: (value: T) => void 
}) => {
    const t = useI18n();

    const rawProps = useBlockProps(props, {
        display: "inline-block",
        verticalAlign: "top",
        backgroundColor: "subtle"
    });

    const onChangeInner = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        if (onChange) onChange(event.target.value as T);
    }, [onChange]);

    return (
        <input
            type={ type }
            name={ name }
            value={ value ?? undefined }
            onChange={ onChangeInner }
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
