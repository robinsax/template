/**
*   Client organization state hooks and contexts.
*
*   Clients are often top-level state because most application actions occur in the
*   context of a client organization.
*
*   This module handles two different states:
*   - The list of clients which the current user can see.
*   - The active client which the user is currently viewing.
*/
import React, {
    ReactNode, createContext, useCallback, useContext, useMemo
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { ClientModel } from '@/models';
import { SplashScreen, FullAreaSpinner } from '@/components/common';

import { AuthzScopeProvider } from './authz';
import { useSavedState } from './util';
import { createFetchedStateContext } from './fetched-state';

const {
    Provider: ClientsProviderInner,
    useProvidedState: useClientsInner,
    useProvidedStateOrNull: useClientsOrNull
} = createFetchedStateContext<ClientModel[]>();

// Active client context machinery.
type ActiveClientContext = {
    activeClient: ClientModel | null,
    setActiveClient: (client: ClientModel | null) => void
};

const activeClientContext = createContext<ActiveClientContext>(
    null as unknown as ActiveClientContext
);

/**
*   Provides the "active client" context from within the {@link ClientsProvider}.
*/
const ActiveClientProviderInner = ({ children, requireActive }: {
    children: ReactNode,
    requireActive: boolean
}) => {
    const location = useLocation();
    const clients = useClientsOrNull();

    const [activeClientId, setActiveClientId] = useSavedState<string | null>(
        'active-client', null
    );

    const setActiveClient = useCallback((client: ClientModel | null) => {
        setActiveClientId(client ? client.id : null);
    }, []);

    const activeClient = useMemo(() => {
        if (!activeClientId || !clients) return null;

        return clients.find(client => client.id === activeClientId) || null;
    }, [clients, activeClientId]);

    if (requireActive && clients && !activeClient) {
        return <Navigate to={ '/select-client?dest=' + location.pathname }/>;
    }

    return (
        <activeClientContext.Provider value={ { activeClient, setActiveClient } }>
            { clients ? (
                !activeClient ? (
                    children
                ) : (
                    <AuthzScopeProvider clientId={ activeClient.id }>
                        { children }
                    </AuthzScopeProvider>
                )
            ) : (
                <SplashScreen>
                    <FullAreaSpinner/>
                </SplashScreen>
            ) }
        </activeClientContext.Provider>
    );
};

/**
*   Provides the both the "client list" and "active client" contexts.
*
*   Acts as a route-level guard when `requireActive` is `true`.
*/
export const ClientsProvider = ({ children, requireActive = false }: {
    children: ReactNode,
    requireActive?: boolean
}) => {
    return (
        <ClientsProviderInner
            fetch={ api => api.clients.get() }
            queryKey="clients"
        >
            <ActiveClientProviderInner requireActive={ requireActive }>
                { children }
            </ActiveClientProviderInner>
        </ClientsProviderInner>
    );
};

/**
*   Return the global list of Clients visible to the current user.
*
*   Must only be called below a {@link ClientsProvider}.
*/
export const useClients = () => useClientsInner() || [];

/**
*   Return the active Client, or `null` if there isn't one.
*/
export const useActiveClientOrNull = () => {
    const context = useContext(activeClientContext);
    if (!context) return null;

    return context.activeClient;
};

/**
*   Return the active Client.
*
*   Only usable below a {@link ClientsProvider}.
*/
export const useActiveClient = () => useActiveClientOrNull() as ClientModel;

/**
*   Returns a function to switch the active Client, or `null` if there isn't one
*   being broadcast.
*/
export const useSwitchClientOrNull = () => {
    const context = useContext(activeClientContext);
    if (!context) return null;

    return context.setActiveClient;
};

/**
*   Returns a function to switch the active Client.
*
*   Only usable below a {@link ClientsProvider}.
*/
export const useSwitchClient = () => (
    useSwitchClientOrNull() as (client: ClientModel | null) => void
);
