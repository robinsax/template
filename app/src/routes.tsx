import { Dashboard } from "./screens";

export const routes = {
    "/home": Dashboard
};

export type RoutePath = keyof typeof routes;
