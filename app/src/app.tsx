/**
*   App main and routing table.
* 
*   Upper levels of the component tree are inlined in routes to maximize render reuse.
*   This is important because of fetched state providers, and also allows more graceful
*   loading states.
*/
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Spinner } from '@chakra-ui/react';

import {
    APIClientProvider, AuthProvider, NoAuthGuard, I18nProvider
} from '@/hooks';
import {
    Dashboard, Login, Join, NotFound, ManageUsers, Privacy, Terms,
    AboutHome
} from '@/screens';
import { SplashScreen } from '@/components/common';
import { NotificationsProvider } from '@/components/users';
import { ThemedRoot } from '@/theme';

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
                <BrowserRouter>
                    <Routes>
                        <Route
                            path="/"
                            element={ <Dashboard/> }
                        />
                        <Route
                            path="/home"
                            element={ <AboutHome/> }
                        />
                        <Route
                            path="/privacy"
                            element={ <Privacy/> }
                        />
                        <Route
                            path="/terms"
                            element={ <Terms/> }
                        />
                        <Route
                            path="/login"
                            element={ 
                                <NoAuthGuard>
                                    <SplashScreen>
                                        <Login/>
                                    </SplashScreen>
                                </NoAuthGuard>
                            }
                        />
                        <Route
                            path="/join"
                            element={
                                <NoAuthGuard>
                                    <Join/>
                                </NoAuthGuard>
                            }
                        />
                        <Route
                            path="/management/users"
                            element={
                                <ManageUsers/>
                            }
                        />
                        <Route
                            path="*"
                            element={ <NotFound/> }
                        />
                    </Routes>
                </BrowserRouter>
            ) }
        </NotificationsProvider>
        </AuthProvider>
        </APIClientProvider>
        </I18nProvider>
        </ThemedRoot>
    );
};

const root = ReactDOM.createRoot(document.getElementById('mount') as HTMLElement);
root.render(<App/>);
