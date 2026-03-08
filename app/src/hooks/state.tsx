import React, {
    createContext, useEffect, useState, useMemo, ReactNode, useContext
} from "react";

import {
    MutationFn, QueryFn, StateEngine, createStateEngine, queryAuthState,
    queryLocalSettings
} from "@/state";
import { createAPIClient } from "@/api-client";

import { fireGlobalError } from "./errors";

const stateEngineContext = createContext<StateEngine>(null as unknown as StateEngine);

export const StateEngineProvider = ({ children }: { children: ReactNode }) => {
    const stateEngine = useMemo(() => {
        const api = createAPIClient();
        const engine = createStateEngine(api);

        engine.queryListen(queryLocalSettings, settings => {
            if (!settings) return;

            api.setLocale(settings.locale);
        });
        engine.queryListen(queryAuthState, authState => {
            api.setAuthToken(authState ? authState.token : null);
        });

        return engine;
    }, []);

    return (
        <stateEngineContext.Provider value={ stateEngine }>
            { children }
        </stateEngineContext.Provider>
    );
};

export const useQuery = <R, P = null>(
    fn: QueryFn<R, P>, ...args: P extends null ? [] : [param: P]
): [R | null, boolean, Error | null] => {
    const [data, setData] = useState<R | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const engine = useContext(stateEngineContext);

    useEffect(() => {
        const listener = (
            newData: R | null, newError: Error | null, newLoading: boolean
        ) => {
            setData(newData);
            setError(newError);
            setLoading(newLoading);
        };

        return engine.queryListen(fn as QueryFn<R, P | undefined>, listener, args[0]);
    }, []);

    return [data, loading, error];
};

export type WrappedMutationFn<P> = (
    unknown extends P ? () => void : (param: P) => void
);

export const useMutation = <P, R = void>(
    fn: MutationFn<P, R>, onSuccess?: (result: R) => void
): [WrappedMutationFn<P>, boolean, Error | null] => {
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const engine = useContext(stateEngineContext);

    const onMutate = useMemo(() => {
        let locked = false;

        const callback = (param: P) => {
            (async () => {
                if (locked) return;
                locked = true;
                setWorking(true);

                try {
                    const result = await engine.mutate(fn, param);
                    setError(null);
                    if (onSuccess) onSuccess(result);
                } catch (err) {
                    const castErr = err instanceof Error ? err : new Error(String(err));
                    setError(castErr);
                    fireGlobalError(castErr);
                } finally {
                    setWorking(false);
                    locked = false;
                }
            })();
        };

        return callback;
    }, [fn]);

    return [onMutate as WrappedMutationFn<P>, working, error];
};
