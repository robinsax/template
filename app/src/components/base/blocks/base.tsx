import { MouseEvent, Ref, useMemo } from "react";
import { CSSObject } from "@emotion/react";

import { Theme, theme } from "@/theme";

type StringStyles = (
    "border" | "borderTop" | "borderRight" | "borderBottom" | "borderLeft" |
    "display" | "textDecoration" | "fontWeight" | "verticalAlign" | "cursor" |
    "transform"
);

type NumberStyles = (
    "opacity" | "zIndex"
);

type BlockStylesColor = Theme["color"] | "transparent" | "inherit";

export type BlockStyles = {
    color?: BlockStylesColor,
    backgroundColor?: BlockStylesColor,
    borderColor?: BlockStylesColor,
    boxShadow?: Theme["shadow"] | "none",
    font?: Theme["font"] | "inherit",
    margin?: number | string,
    m?: number | string,
    mx?: number | string,
    my?: number | string,
    padding?: number | string,
    p?: number | string,
    px?: number | string,
    py?: number | string,
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
    fontSize?: Theme["fontSize"],
    gap?: number | string,
    hover?: BlockStyles,
    flex?: number | string,
    position?: "static" | "relative" | "absolute" | "fixed",
    pointerEvents?: "auto" | "none",
    flexDirection?: "row" | "column",
    justifyContent?: "flex-start" | "flex-end" | "center" | "space-between",
    alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline",
    userSelect?: "none" | "auto",
    textAlign?: "left" | "center" | "right"
} & (
    Partial<Record<StringStyles, string>> &
    Partial<Record<NumberStyles, number>>
);

const renderGridValue = (value: number | string) => {
    const [cell, units] = theme.grid as [number, string];

    if (typeof value == "number") {
        return value * cell + units;
    }
    return value;
};

const renderColor = (color: Theme["color"]) => {
    return `var(--c-${ theme.colors[color] })`;
};

const renderFont = (font: Theme["font"]) => {
    return `var(--f-${ theme.fonts[font] })`;
};

const renderShadow = (shadow: Theme["shadow"]) => {
    return `var(--s-${ theme.shadows[shadow] })`;
};

const renderFontSize = (fontSize: Theme["fontSize"]) => {
    return `var(--fs-${ theme.fontSizes[fontSize] })`;
};

const blockStyleAliases = {
    m: "margin",
    mx: "marginX",
    my: "marginY",
    p: "padding",
    px: "paddingX",
    py: "paddingY"
} as Record<string, string>;

const blockStyleRenderers = {
    color: renderColor,
    backgroundColor: renderColor,
    borderColor: renderColor,
    boxShadow: renderShadow,
    fontFamily: renderFont,
    top: renderGridValue,
    left: renderGridValue,
    right: renderGridValue,
    bottom: renderGridValue,
    margin: renderGridValue,
    padding: renderGridValue,
    width: renderGridValue,
    minWidth: renderGridValue,
    maxWidth: renderGridValue,
    height: renderGridValue,
    minHeight: renderGridValue,
    maxHeight: renderGridValue,
    fontSize: renderFontSize,
    gap: renderGridValue
} as const;

const renderBlockStyles = (input: BlockStyles) => {
    const styles: CSSObject = {};

    for (const rawKey of Object.keys(input) as (keyof BlockStyles)[]) {
        const key = blockStyleAliases[rawKey] || rawKey;

        if (key == "hover") {
            styles["&:hover"] = renderBlockStyles(input.hover || {});
        } else if (key in blockStyleRenderers) {
            const renderer = (
                blockStyleRenderers[key as keyof typeof blockStyleRenderers]
            );

            // @ts-expect-error ts(2590) ts(2345)
            styles[key] = renderer(input[rawKey]);
        } else {
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

        return { ...props, css };
    }, [props, ...defaultDeps]);
};
