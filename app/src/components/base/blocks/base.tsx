import { MouseEvent, Ref, useMemo } from "react";
import { CSSObject } from "@emotion/react";

import { Theme, theme } from "@/theme";

type SidesRuleStyles<P extends string, S extends string, V> = {
    [K in (
        `${P}${S}` | `${P}Top${S}` | `${P}Right${S}` | `${P}Bottom${S}` | `${P}Left${S}`
    )]?: V;
};

const sidesRuleNames = (prefix: string, suffix: string = "") => [
    `${prefix}${suffix}`,
    `${prefix}Top${suffix}`, `${prefix}Right${suffix}`,
    `${prefix}Bottom${suffix}`, `${prefix}Left${suffix}`
] as const;

export type BlockStyleColor = Theme["color"] | "transparent" | "inherit";

export type BlockStyles = {
    // Special rules.
    hover?: BlockStyles,
    focus?: BlockStyles,
    paddingX?: number | string,
    paddingY?: number | string,
    marginX?: number | string,
    marginY?: number | string,
    // True rules.
    color?: BlockStyleColor,
    backgroundColor?: BlockStyleColor,
    borderColor?: BlockStyleColor,
    boxShadow?: Theme["shadow"] | "none",
    fontFamily?: Theme["font"] | "inherit",
    borderRadius?: number | string,
    borderTopLeftRadius?: number | string,
    borderTopRightRadius?: number | string,
    borderBottomLeftRadius?: number | string,
    borderBottomRightRadius?: number | string,
    top?: number | string,
    left?: number | string,
    right?: number | string,
    bottom?: number | string,
    width?: number | string,
    minWidth?: number | string,
    maxWidth?: number | string,
    height?: number | string,
    minHeight?: number | string,
    maxHeight?: number | string,
    fontSize?: Theme["fontSize"] | number,
    gap?: number | string,
    flex?: number | string,
    display?: (
        "block" | "inline-block" | "flex" | "inline-flex" | "grid" |
        "inline-grid" | "table" | "inline-table" | "none"
    ),
    position?: "static" | "relative" | "absolute" | "fixed",
    pointerEvents?: "auto" | "none",
    flexDirection?: "row" | "column",
    justifyContent?: "flex-start" | "flex-end" | "center" | "space-between",
    alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline",
    userSelect?: "none" | "auto",
    textAlign?: "left" | "center" | "right",
    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | number,
    cursor?: "pointer" | "default" | "not-allowed" | "text" | "grab" | "grabbing",
    transform?: string,
    textDecoration?: "none" | "underline" | "line-through",
    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize",
    verticalAlign?: "top" | "middle" | "bottom" | "baseline",
    transition?: string,
    boxSizing?: "content-box" | "border-box",
    outline?: string,
    zIndex?: number,
    animation?: string
} & (
    SidesRuleStyles<"border", "Color", BlockStyleColor> &
    SidesRuleStyles<"border", "", Theme["border"] | "none"> &
    SidesRuleStyles<"margin", "", string | number> &
    SidesRuleStyles<"padding", "", string | number>
);

const styleKeys = new Set([
    "color", "backgroundColor",
    "borderColor", "borderRadius",
    "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius",
    "borderBottomRightRadius",
    "fontSize", "fontFamily", "textAlign",
    "textDecoration", "fontWeight", "textTransform",
    "top", "left", "right", "bottom",
    "width", "minWidth", "maxWidth", "height", "minHeight", "maxHeight",
    "display", "position", "verticalAlign",
    "flex", "gap", "flexDirection", "justifyContent", "alignItems",
    "pointerEvents", "userSelect",
    ...sidesRuleNames("border"), ...sidesRuleNames("border", "Color"), "outline",
    ...sidesRuleNames("margin"), "marginX", "marginY",
    ...sidesRuleNames("padding"), "paddingX", "paddingY",
    "cursor", "boxShadow", "transform", "opacity", "zIndex", "transition", "boxSizing",
    "animation"
]);

const renderGridValue = (value: number | string) => {
    const [cell, units] = theme.grid as [number, string];

    if (typeof value == "number") {
        return value * cell + units;
    }
    return value;
};

const renderColor = (color: Theme["color"]) => {
    return `var(--c-${ color })`;
};

const renderFont = (font: Theme["font"]) => {
    return `var(--f-${ font })`;
};

const renderShadow = (shadow: Theme["shadow"]) => {
    return `var(--s-${ shadow })`;
};

const renderFontSize = (fontSize: Theme["fontSize"] | number) => {
    if (typeof fontSize == "number") return renderGridValue(fontSize);

    return `var(--fs-${ fontSize })`;
};

const renderBorder = (border: Theme["border"] | "none") => {
    if (border == "none") return "none";
    return `var(--b-${ border })`;
};

const blockStyleRenderers = {
    color: renderColor,
    backgroundColor: renderColor,
    borderColor: renderColor,
    borderLeftColor: renderColor,
    borderTopColor: renderColor,
    borderRightColor: renderColor,
    borderBottomColor: renderColor,
    boxShadow: renderShadow,
    borderRadius: renderGridValue,
    borderTopLeftRadius: renderGridValue,
    borderTopRightRadius: renderGridValue,
    borderBottomLeftRadius: renderGridValue,
    borderBottomRightRadius: renderGridValue,
    fontFamily: renderFont,
    top: renderGridValue,
    left: renderGridValue,
    right: renderGridValue,
    bottom: renderGridValue,
    width: renderGridValue,
    minWidth: renderGridValue,
    maxWidth: renderGridValue,
    height: renderGridValue,
    minHeight: renderGridValue,
    maxHeight: renderGridValue,
    fontSize: renderFontSize,
    gap: renderGridValue,
    border: renderBorder,
    borderTop: renderBorder,
    borderRight: renderBorder,
    borderBottom: renderBorder,
    borderLeft: renderBorder
} as const;

const renderBlockStyles = (input: BlockStyles) => {
    const styles: CSSObject = {};

    for (const rawKey of Object.keys(input) as (keyof BlockStyles)[]) {
        const key = rawKey;

        if (key.startsWith("margin") || key.startsWith("padding")) {
            const baseKey = key.startsWith("margin") ? "margin" : "padding";
            const value = renderGridValue(input[key] as string | number);

            if (key.endsWith("Top")) {
                styles[`${baseKey}Top`] = value;
            } else if (key.endsWith("Right")) {
                styles[`${baseKey}Right`] = value;
            } else if (key.endsWith("Bottom")) {
                styles[`${baseKey}Bottom`] = value;
            } else if (key.endsWith("Left")) {
                styles[`${baseKey}Left`] = value;
            } else if (key.endsWith("X")) {
                styles[`${baseKey}Right`] = value;
                styles[`${baseKey}Left`] = value;
            } else if (key.endsWith("Y")) {
                styles[`${baseKey}Top`] = value;
                styles[`${baseKey}Bottom`] = value;
            } else {
                styles[`${baseKey}Top`] = value;
                styles[`${baseKey}Right`] = value;
                styles[`${baseKey}Bottom`] = value;
                styles[`${baseKey}Left`] = value;
            }
        } else if (key == "hover") {
            styles["&:hover"] = renderBlockStyles(input.hover || {});
        } else if (key == "focus") {
            styles["&:focus"] = renderBlockStyles(input.focus || {});
        } else if (key in blockStyleRenderers) {
            const renderer = (
                blockStyleRenderers[key as keyof typeof blockStyleRenderers]
            );

            // @ts-expect-error ts(2590) ts(2345)
            styles[key] = renderer(input[rawKey]);
        } else if (styleKeys.has(key)) {
            styles[key] = input[rawKey];
        }
    }

    return styles;
};

type MouseHandlers = (
    "onClick" | "onMouseEnter" | "onMouseLeave" | "onMouseDown" | "onMouseUp"
);

export type BlockProps<T = HTMLDivElement> = {
    ref?: Ref<T>
} & (
    BlockStyles &
    Partial<Record<MouseHandlers, (event: MouseEvent) => void>>
);

export const useBlockProps = <T = HTMLDivElement>(
    props: BlockProps<T>, defaults: BlockStyles = {}, defaultDeps: unknown[] = []
) => {
    return useMemo(() => {
        const css = renderBlockStyles({
            ...defaults, ...props,
            hover: {
                ...(defaults.hover || {}),
                ...(props.hover || {})
            }
        });

        const rest = { ...props };
        delete rest.hover;
        for (const key of Object.keys(rest) as (keyof BlockProps<T>)[]) {
            if (styleKeys.has(key)) delete rest[key];
        }

        return { ...rest, css };
    }, [props, ...defaultDeps]);
};
