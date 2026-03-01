/**
*   Icon set. Defined in a way that allows type-safe references to icons in generated
*   code.
*
*   Using an icon set ensures icons are consistent throughout the app.
*/
import React, { SVGAttributes, useMemo } from "react";
import {
    MdModeEdit, MdDelete, MdOutlineRefresh, MdOutlineTextFields, MdAccountTree,
    MdDarkMode, MdFastfood, MdSportsFootball, MdTablet, MdComputer, MdDiamond,
    MdOutlinePets, MdAnalytics, MdSmartToy, MdEmail, MdHighQuality, MdRemoveRedEye,
    MdArchive, MdUnarchive, MdAdsClick
} from "react-icons/md";
import {
    FaChevronRight, FaComments, FaExternalLinkSquareAlt, FaGlobeAmericas, FaFilter,
    FaChevronDown, FaChevronLeft, FaCalendarWeek, FaFireAlt, FaTools, FaIndustry,
    FaChevronUp, FaHeart, FaTv, FaPlaneArrival, FaPlaneDeparture, FaCheck, FaCircle,
    FaUpload, FaComment, FaGavel, FaSearch, FaLayerGroup, FaSnapchatSquare, FaInstagram,
    FaFacebook, FaAmazon, FaPaintBrush, FaPencilRuler
} from "react-icons/fa";
import {
    FaBox, FaPerson, FaShield, FaCropSimple, FaMeta, FaFileImage
} from "react-icons/fa6";
import { HiSwitchHorizontal } from "react-icons/hi";
import {
    IoMdSettings, IoMdAddCircle, IoMdMegaphone, IoMdAppstore, IoMdInformationCircle,
    IoMdHome, IoMdCart, IoMdMale, IoMdFemale, IoMdPhonePortrait, IoMdNotifications,
    IoIosLock, IoLogoPinterest
} from "react-icons/io";
import {
    IoStorefrontSharp, IoPeople, IoMaleFemale, IoPlay, IoPause, IoMenu, IoStop
} from "react-icons/io5";
import {
    RiAdvertisementFill, RiLogoutBoxFill, RiLoginBoxFill, RiResetLeftFill,
    RiMoneyDollarCircleFill, RiAiGenerate2,
    RiChatAiFill
} from "react-icons/ri";
import { BiSolidDashboard, BiSolidError, BiSolidDuplicate } from "react-icons/bi";
import {
    AiFillLike, AiFillDislike, AiFillTikTok, AiOutlineGoogle, AiFillClockCircle
} from "react-icons/ai";
import { GrTechnology } from "react-icons/gr";
import { GiRolledCloth, GiLipstick } from "react-icons/gi";
import { BsQuestionLg, BsBarChartLineFill } from "react-icons/bs";
import { LuTarget} from "react-icons/lu";
import { TbAspectRatioFilled, TbResize, TbBubbleTextFilled } from "react-icons/tb";
import { SiGoogleads, SiGoogledisplayandvideo360 } from "react-icons/si";
import { FiMinimize2 } from "react-icons/fi";
import { TiVideo } from "react-icons/ti";
import { PiNewspaperClippingFill } from "react-icons/pi";

import { error } from "@/util";
import { ThemeColor, useThemeColor } from "@/theme";

// Icons manifest.
const icons = {
    darkTheme: MdDarkMode,
    edit: MdModeEdit,
    delete: MdDelete,
    archive: MdArchive,
    dearchive: MdUnarchive,
    right: FaChevronRight,
    left: FaChevronLeft,
    down: FaChevronDown,
    up: FaChevronUp,
    menu: IoMenu,
    manage: MdAccountTree,
    switch: HiSwitchHorizontal,
    refresh: MdOutlineRefresh,
    settings: IoMdSettings,
    text: MdOutlineTextFields,
    add: IoMdAddCircle,
    grouping: FaLayerGroup,
    duplicate: BiSolidDuplicate,
    link: FaExternalLinkSquareAlt,
    logOut: RiLogoutBoxFill,
    logIn: RiLoginBoxFill,
    ad: RiAdvertisementFill,
    search: FaSearch,
    adAction: MdAdsClick,
    dashboard: BiSolidDashboard,
    globe: FaGlobeAmericas,
    chart: BsBarChartLineFill,
    headline: PiNewspaperClippingFill,
    megaphone: IoMdMegaphone,
    video: TiVideo,
    tiktok: AiFillTikTok,
    pinterest: IoLogoPinterest,
    like: AiFillLike,
    dislike: AiFillDislike,
    money: RiMoneyDollarCircleFill,
    app: IoMdAppstore,
    comments: FaComments,
    comment: FaComment,
    ai: MdSmartToy,
    aiChat: RiChatAiFill,
    aiGenerate: RiAiGenerate2,
    aiSummary: TbBubbleTextFilled,
    rule: FaPencilRuler,
    reset: RiResetLeftFill,
    calendar: FaCalendarWeek,
    mail: MdEmail,
    info: IoMdInformationCircle,
    error: BiSolidError,
    store: IoStorefrontSharp,
    tech: GrTechnology,
    home: IoMdHome,
    pets: MdOutlinePets,
    cart: IoMdCart,
    people: IoPeople,
    clothes: GiRolledCloth,
    makeup: GiLipstick,
    fire: FaFireAlt,
    sports: MdSportsFootball,
    box: FaBox,
    food: MdFastfood,
    tools: FaTools,
    industry: FaIndustry,
    male: IoMdMale,
    female: IoMdFemale,
    gender: IoMaleFemale,
    person: FaPerson,
    question: BsQuestionLg,
    heart: FaHeart,
    diamond: MdDiamond,
    tablet: MdTablet,
    computer: MdComputer,
    phone: IoMdPhonePortrait,
    tv: FaTv,
    shield: FaShield,
    target: LuTarget,
    arrive: FaPlaneArrival,
    depart: FaPlaneDeparture,
    check: FaCheck,
    circle: FaCircle,
    upload: FaUpload,
    google: AiOutlineGoogle,
    googleAds: SiGoogleads,
    googleDV360: SiGoogledisplayandvideo360,
    meta: FaMeta,
    instagram: FaInstagram,
    snapchat: FaSnapchatSquare,
    facebook: FaFacebook,
    amazon: FaAmazon,
    judge: FaGavel,
    notifications: IoMdNotifications,
    crop: FaCropSimple,
    play: IoPlay,
    stop: IoStop,
    pause: IoPause,
    aspectRatio: TbAspectRatioFilled,
    downsize: FiMinimize2,
    resize: TbResize,
    lock: IoIosLock,
    reveal: MdRemoveRedEye,
    analytics: MdAnalytics,
    clock: AiFillClockCircle,
    filter: FaFilter,
    image: FaFileImage,
    quality: MdHighQuality,
    art: FaPaintBrush
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
    if (!Target) return error("Icon not found: " + name, []);

    const colorValue = color ? useThemeColor(color) : undefined;

    return (
        <Target { ...props } style={ { color: colorValue } }/>
    );
};
