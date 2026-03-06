import React, { ComponentType, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

export const routes = {
    privacy: "/privacy",
    terms: "/terms",
    login: "/log-in"
};

export type RouteKey = keyof typeof routes;

const routing = {
    [routes.privacy]: () => import('./screens/privacy'),
    [routes.terms]: () => import('./screens/terms'),
    [routes.login]: () => import('./screens/login'),
    "/*": () => import('./screens/not-found')
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
