import React, { ComponentType, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

export const routes = {
    "/": () => import('./screens/dashboard'),
    "/landing": () => import('./screens/landing'),
    "/login": () => import('./screens/login'),
    "/join": () => import('./screens/join'),
    "/users": () => import('./screens/manage-users'),
    "/privacy": () => import('./screens/privacy'),
    "/terms": () => import('./screens/terms'),
    "/*": () => import('./screens/not-found')
} satisfies Record<string, () => Promise<{ default: ComponentType }>>;

export type RoutePath = keyof typeof routes;

const LoadedRoute = ({ loader }: { loader: () => Promise<{ default: ComponentType }> }) => {
    const [Component, setComponent] = useState<ComponentType | null>(null);

    useEffect(() => {
        loader().then(module => setComponent(module.default));
    }, [loader]);

    return Component ? <Component/> : null;
};

export const Router = () => {
    return (
        <BrowserRouter>
            <Routes>
                { Object.entries(routes).map(([path, loader]) => (
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
