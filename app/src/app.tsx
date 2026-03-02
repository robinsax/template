/**
*   App main and routing table.
* 
*   Upper levels of the component tree are inlined in routes to maximize render reuse.
*   This is important because of fetched state providers, and also allows more graceful
*   loading states.
*/
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Spinner } from "@chakra-ui/react";

import {
    APIClientProvider, AuthProvider, I18nProvider
} from "@/hooks";
import { Router } from "@/routing";
import { SplashScreen } from "@/components/design";
import { NotificationsProvider } from "@/components/users";
import { ThemedRoot } from "@/theme";

export const App = () => {
    const [authReady, setAuthReady] = useState(false);

    return (
        <ThemedRoot>
        <I18nProvider>
        <APIClientProvider>
        <AuthProvider onReady={ () => setAuthReady(true) }>
        <NotificationsProvider>
            { !authReady ? (
                <SplashScreen>
                    <Spinner/>
                </SplashScreen>
            ) : (
                <Router/>
            ) }
        </NotificationsProvider>
        </AuthProvider>
        </APIClientProvider>
        </I18nProvider>
        </ThemedRoot>
    );
};

const main = () => {
    const root = createRoot(document.getElementById("mount") as HTMLElement);
    root.render(<App/>);
};

main();
