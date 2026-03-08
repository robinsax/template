import { ReactNode } from "react";

import { RouteKey } from "@/routing";
import { useRoute } from "@/hooks";

import { Link, Button, IconName, BlockStyles } from "./blocks";

export const NavLink = ({
    route, children, icon, buttonStyles, ...props
}: BlockStyles & {
    children?: ReactNode,
    icon?: IconName,
    route: RouteKey,
    buttonStyles?: BlockStyles
}) => {
    const [currentRoute] = useRoute();

    return (
        <Link
            route={ route } width="100%"
            { ...props }
        >
            <Button
                ghost icon={ icon } iconLeft width="100%"
                justifyContent="flex-start"
                active={ currentRoute == route }
                { ...buttonStyles }
            >
                { children }
            </Button>
        </Link>
    );
};
