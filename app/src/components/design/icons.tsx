/**
*   Icon set. Defined in a way that allows type-safe references to icons in generated
*   code.
*
*   Using an icon set ensures icons are consistent throughout the app.
*/
import React, { SVGAttributes, useMemo } from "react";
import { MdDarkMode } from "react-icons/md";
import {
    FaChevronUp, FaChevronDown, FaGlobeAmericas, FaChevronLeft, FaChevronRight, FaCog,
    FaTrash, FaBell, FaInfoCircle
} from "react-icons/fa";
import { BiSolidError } from "react-icons/bi";

import { throwOrFallback } from "@/util";
import { ThemeColor, useThemeColor } from "@/theme";

// Icons manifest.
const icons = {
    darkTheme: MdDarkMode,
    up: FaChevronUp,
    down: FaChevronDown,
    left: FaChevronLeft,
    right: FaChevronRight,
    settings: FaCog,
    globe: FaGlobeAmericas,
    error: BiSolidError,
    delete: FaTrash,
    notifications: FaBell,
    info: FaInfoCircle
};

/**
*   The set of available icon names.
*/
export type IconName = keyof typeof icons;

/**
*   Return `name` as an {@link IconName} if it is valid, and an error icon name
*   otherwise.
*/
export const safeIconName = (name: string): IconName => {
    if (name in icons) return name as IconName;

    return "error";
};

/**
*   Icon component. Always use this component for presenting icons. See {@link IconName}
*   for available icons.
*/
export const Icon = ({ name, color, ...props }: {
    name: IconName,
    size?: string,
    color?: ThemeColor
} & SVGAttributes<SVGSVGElement>) => {
    const Target = useMemo(() => icons[name], [name]);
    if (!Target) return throwOrFallback("Icon not found: " + name, null);

    const colorValue = color ? useThemeColor(color) : undefined;

    return (
        <Target { ...props } style={ { color: colorValue } }/>
    );
};
