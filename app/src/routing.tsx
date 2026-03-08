import { ComponentType, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

export const routes = {
    home: "/",
    userHome: "/dashboard",
    privacy: "/privacy",
    terms: "/terms",
    login: "/log-in",
    loginReset: "/log-in/reset",
    signup: "/sign-up",
    signupConfirm: "/sign-up/confirm",
    admin: "/admin"
};

export type RouteKey = keyof typeof routes;

const routing = {
    [routes.home]: () => import("./screens/home"),
    [routes.privacy]: () => import("./screens/privacy"),
    [routes.terms]: () => import("./screens/terms"),
    [routes.login]: () => import("./screens/login"),
    [routes.loginReset]: () => import("./screens/login-reset"),
    [routes.signup]: () => import("./screens/signup"),
    [routes.signupConfirm]: () => import("./screens/signup-confirm"),
    [routes.userHome]: () => import("./screens/user-home"),
    [routes.admin]: () => import("./screens/admin"),
    "/*": () => import("./screens/not-found")
} satisfies Record<string, () => Promise<{ default: ComponentType }>>;

const LoadedRoute = ({ loader }: {
    loader: () => Promise<{ default: ComponentType }>
}) => {
    const [Component, setComponent] = useState<{ c: ComponentType }  | null>(null);

    useEffect(() => {
        loader().then(module => setComponent({ c: module.default }));
    }, [loader]);

    return Component ? <Component.c/> : null;
};

export const Router = () => {
    return (
        <BrowserRouter>
            <Routes>
                { Object.entries(routing).map(([path, loader]) => (
                    <Route
                        key={ path }
                        path={ path }
                        element={ <LoadedRoute loader={ loader }/> }
                    />
                )) }
            </Routes>
        </BrowserRouter>
    );
};
