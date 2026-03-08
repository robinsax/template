/**
*   Icon set. Defined in a way that allows type-safe references to icons in generated
*   code.
*
*   Using an icon set ensures icons are consistent throughout the app.
*/
import { useMemo } from "react";
import {
    MdOutlineDarkMode, MdLogin, MdOutlineEmail, MdOutlinePassword, MdLogout
} from "react-icons/md";
import {
    HiChevronLeft, HiChevronRight, HiChevronUp, HiChevronDown
} from "react-icons/hi";
import { FaTrash, FaBell } from "react-icons/fa";
import { BiSolidError } from "react-icons/bi";
import { ImSpinner8 } from "react-icons/im";
import { AiOutlineUserAdd, AiOutlineUser } from "react-icons/ai";
import { IoLockOpenOutline, IoSettingsOutline } from "react-icons/io5";
import { IoMdGlobe } from "react-icons/io";
import { RiAdminLine } from "react-icons/ri";
import { RxDashboard } from "react-icons/rx";

import { throwOrFallback } from "@/util";

import { BlockStyles, useBlockProps } from "./base";

// Icons manifest.
const icons = {
    darkTheme: MdOutlineDarkMode,
    up: HiChevronUp,
    down: HiChevronDown,
    left: HiChevronLeft,
    right: HiChevronRight,
    settings: IoSettingsOutline,
    globe: IoMdGlobe,
    error: BiSolidError,
    delete: FaTrash,
    notifications: FaBell,
    login: MdLogin,
    logout: MdLogout,
    loading: ImSpinner8,
    email: MdOutlineEmail,
    password: MdOutlinePassword,
    signup: AiOutlineUserAdd,
    user: AiOutlineUser,
    unlock: IoLockOpenOutline,
    admin: RiAdminLine,
    dashboard: RxDashboard
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
export const Icon = ({ name, ...props }: BlockStyles & {
    name: IconName
}) => {
    const Target = useMemo(() => icons[name], [name]);
    if (!Target) return throwOrFallback("Icon not found: " + name, null);

    const rawProps = useBlockProps(props, {
        display: "block",
        verticalAlign: "middle"
    });

    return (
        <Target { ...rawProps } />
    );
};

export const LoadIndicator = () => {
    return (
        <Icon name="loading" animation="spin 1s linear infinite" />
    );
};
