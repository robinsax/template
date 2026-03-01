import { ComponentType } from "react";

import { Dashboard } from "./screens";

export const routes = {
    "/home": Dashboard
} satisfies Record<string, ComponentType<any>>;

export type RoutePath = keyof typeof routes;
