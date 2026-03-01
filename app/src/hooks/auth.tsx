/**
*   Authentication state hooks and contexts.
*/
import React, {
    ReactNode, createContext, useContext, useEffect, useRef, useState
} from "react";
import { Navigate, useLocation } from "react-router-dom";

import { AuthKeyModel, UserModel } from "@/models";
import { error } from "@/util";

import { useSavedState, useAsyncEffect, useAsyncCallback } from "./util";
import { APIError, useAPI } from "./api";
import { I18nLocaleKey, useLocale } from "./i18n";

export type LoginCredentials = {
    email: string,
    password: string
};

/**
*   Authentication control interface.
*/
export type AuthControl = {
    login(login: LoginCredentials): Promise<void>,
    logout(): Promise<void>,
    invalidateUser(): void,
    resetState(): void
}

type AuthContext = {
    user: UserModel | null,
    authToken: string | null,
    authControl: AuthControl
}

const authContext = createContext<AuthContext>(null as unknown as AuthContext);

/**
*   Global authentication provider mounted at the app root.
*
*   Manages the authentication key, automatically distributes it to the API client, and
*   provides the {@link AuthControl}.
*/
export const AuthProvider = ({ children, onReady }: {
    children: ReactNode,
    onReady: () => void
}) => {
    const api = useAPI();
    const [_, setLocale] = useLocale();

    const [user, setUser] = useState<UserModel | null>(null);
    const [authControl, setAuthControl] = useState<AuthControl | null>(null);
    const [authKey, setAuthKey] = useSavedState<AuthKeyModel | null>("auth-key", null);
    const [authToken, setAuthToken] = useSavedState<string | null>("auth-token", null);

    useEffect(() => {
        if (!authControl) return;

        api.setAuthToken(authToken);
    }, [authToken]);

    const [fetchUser] = useAsyncCallback(async () => {
        if (!authToken || !authKey) {
            setAuthKey(null);
            setAuthToken(null);
            setUser(null);
            return;
        }

        try {
            const user = await api.users.id(authKey.user_id).get({ authToken });

            api.setAuthToken(authToken);
            if (user.locale) {
                setLocale(user.locale as I18nLocaleKey);
                api.setLocale(user.locale);
            }

            setUser(user);
        } catch (err) {
            if (!(err instanceof APIError)) throw err;

            // eslint-disable-next-line no-console
            console.error(err);

            setAuthKey(null);
            setAuthToken(null);
        }
    }, [authToken, authKey]);

    const fetchUserRef = useRef(fetchUser);
    useEffect(() => {
        fetchUserRef.current = fetchUser;
    }, [fetchUser]);

    useAsyncEffect(async () => {
        await fetchUserRef.current();

        const login = async (login: LoginCredentials) => {
            const authResp = await api.auth.post({
                email: login.email,
                password: login.password,
                restriction: null
            });
            const authKey = authResp.auth;
            const authToken = authResp.token;
            const user = await api.users.id(authKey.user_id).get({ authToken });

            setAuthKey(authKey);
            setAuthToken(authToken);
            setUser(user);
        };

        const resetState = async () => {
            setAuthKey(null);
            setAuthToken(null);
            setUser(null);
        };

        const logout = async () => {
            await api.auth.delete();

            resetState();
        };

        const invalidateUser = () => fetchUserRef.current();

        setAuthControl({ login, logout, invalidateUser, resetState });
        onReady();
    }, []);

    return (
        !authControl ?
            children
            :
            <authContext.Provider value={{ user, authToken, authControl }}>
                { children }
            </authContext.Provider>
    );
};

/**
*   Returns the global {@link AuthControl}.
*/
export const useAuthControl = () => useContext(authContext).authControl; 

/**
*   Returns the global {@link AuthControl}, or `null` if not within the context.
*/
export const useAuthControlOrNull = () => {
    const context = useContext(authContext);

    return context ? context.authControl : null;
};

/**
*   Returns the current {@link UserModel} if there is one. Safe to call outside of an
*   {@link AuthGuard}.
*/
export const useCurrentUserOrNull = () => {
    const context = useContext(authContext);

    return context ? context.user : null;
};

/**
*   Returns the current {@link UserModel} or throws if there isn"t one. Must only be
*   called below an {@link AuthGuard}.
*/
export const useCurrentUser = () => {
    const user = useCurrentUserOrNull();

    if (!user) {
        return error<UserModel>(
            "useCurrentUser outside AuthGuard",
            {} as unknown as UserModel
        );
    }

    return user;
};

/**
*   Returns the current authentication token or throws if there isn"t one. Must only be
*   called below an {@link AuthGuard}.
*/
export const useCurrentAuthToken = () => {
    const context = useContext(authContext);

    if (!context) {
        return error<string>("useCurrentAuthToken outside AuthGuard", "");
    }

    return context.authToken as string;
};

/**
*   Route-level guard that redirects to the login page if the user is not authenticated.
*/
export const AuthGuard = ({ children }: { children: ReactNode }) => {
    const location = useLocation();
    const user = useCurrentUserOrNull();

    if (!user) return <Navigate to={ "/home?dest=" + location.pathname }/>;

    return <>{ children }</>;
};

/**
*   Route-level guard that redirects to the home page if the user is authenticated.
*/
export const NoAuthGuard = ({ children }: { children: ReactNode }) => {
    const user = useCurrentUserOrNull();

    if (user) return <Navigate to="/"/>;

    return <>{ children }</>;
};
