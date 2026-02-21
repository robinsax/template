/**
*   API client hook and provider. 
*/
import React, { createContext, useContext, useMemo } from 'react';

import { binding } from './binding';
import { APIClientBase, createAPIClientBase } from './base';

export * from './base';

/**
*   The code generated endpoints bindings of the API.
*/
export type APIBinding = ReturnType<typeof binding>;

/**
*   The API client. Calls should be made through the automatically generated binding in
*   almost all cases.
* 
*   Rich types like datetimes are automatically converted.
*/
export type APIClient = APIClientBase & APIBinding;

const apiContext = createContext<APIClient>(null as unknown as APIClient);

/**
*   Global API client provider mounted at the app root. 
*/
export const APIClientProvider = ({ children }: {
    children: React.ReactNode
}) => {
    const api = useMemo(() => {
        const base = createAPIClientBase();

        return { ...base, ...binding(base) } as APIClient;
    }, []);

    return (
        <apiContext.Provider value={ api }>
            { children }
        </apiContext.Provider>
    );
};

/**
*   Return the global {@link APIClient}.
* 
*   Call authentication is handled implicitly by the authentication system.
*/
export const useAPI = () => useContext(apiContext);
