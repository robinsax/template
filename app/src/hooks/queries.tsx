import { useEffect, useMemo, useState } from "react";

import { deepEqual, getGlobalScope } from "@/util";

import { APIClient, useAPI } from "./api";
import { fireGlobalError } from "./errors";

export type QueryExecutor<R, P = never> = (
    api: APIClient, ...args: P extends never ? [] : [params: P]
) => Promise<R> | R;

type QueryState<R, P = never> = {
    fn: QueryExecutor<R, P>,
    params: P | null,
    loading: boolean,
    listeners: (() => void)[],
    data: R | null,
    error: Error | null
};

const getQueryStates = (): QueryState<unknown, unknown>[] => {
    const globalScope = getGlobalScope<{ __queryStates?: QueryState<unknown, unknown>[] }>();

    if (!globalScope.__queryStates) {
        globalScope.__queryStates = [];
    }

    return globalScope.__queryStates;
};

const getQueryState = <R, P>(
    fn: QueryExecutor<R, P>, params: P | null
): QueryState<R, P> => {
    const states = getQueryStates();

    for (const state of states) {
        if (state.fn != fn) continue;

        if (params && deepEqual(state.params, params)) {
            return state as QueryState<R, P>;
        }
    }

    const newState: QueryState<R, P> = {
        fn,
        params: params || null,
        loading: false,
        listeners: [],
        data: null,
        error: null
    };
    // @ts-expect-error ts(2345)
    states.push(newState);

    return newState;
};

const executeQuery = async <R, P>(
    fn: QueryExecutor<R, P>, api: APIClient, ...args: never extends P ? [] : [params: P]
) => {
    const states = getQueryStates();
    const state = await getQueryState(fn, args[0] as P);

    state.loading = true;
    state.listeners.forEach(listener => listener());

    try {
        // @ts-expect-error ts(2556)
        const result = await executor(api, ...args);
        state.data = result;
        state.error = null;
    } catch (err) {
        state.data = null;
        state.error = err instanceof Error ? err : new Error(String(err));
        fireGlobalError(state.error);
    } finally {
        state.loading = false;
        state.listeners.forEach(listener => listener());
    }
};

export const useQuery = <R, P = never>(
    fn: QueryExecutor<R, P>,
    ...args: never extends P ? [] : [params: P]
): [R | null, boolean, Error | null] => {
    const [data, setData] = useState<R | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const api = useAPI();

    useEffect(() => {
        const state = getQueryState(fn, args[0] as P);

        const listener = () => {
            setData(state.data);
            setLoading(state.loading);
            setError(state.error);
        };
        state.listeners.push(listener);
        if (!state.data && !state.error && !state.loading) {
            executeQuery(fn, api, ...args);
        }

        return () => {
            const index = state.listeners.indexOf(listener);
            if (index != -1) {
                state.listeners.splice(index, 1);
            }

            if (state.listeners.length == 0) {
                const states = getQueryStates();
                const stateIndex = states.indexOf(state as QueryState<unknown, unknown>);
                if (stateIndex != -1) {
                    states.splice(stateIndex, 1);
                }
            }
        };
    }, [fn, ...args]);

    return [data, loading, error];
};

export type MutationContext = {
    api: APIClient,
    invalidate: (queries: QueryExecutor<unknown, unknown>[]) => void
};

export type MutationExecutor<P, R> = (
    context: MutationContext, params: P
) => Promise<R> | R;

export const useMutation = <P, R = void>(
    fn: MutationExecutor<P, R>
): [(param: P) => void, boolean, R | null, Error | null] => {
    const [result, setResult] = useState<R | null>(null);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const api = useAPI();

    const executor = useMemo(() => {
        const invalidate = (queries: QueryExecutor<unknown, unknown>[]) => {
            const states = getQueryStates();
            for (const state of states) {
                for (const fn of queries) {
                    if (state.fn == fn) {
                        // @ts-expect-error ts(2556)
                        executeQuery(state.fn, api, ...(state.params ? [state.params] : []));
                    }
                }
            }
        };

        const context: MutationContext = {
            api,
            invalidate
        };

        return (param: P) => {
            setWorking(true);

            (async () => {
                try {
                    const result = await fn(context, param);
                    setResult(result);
                    setError(null);
                } catch (err) {
                    setResult(null);

                    const error = err instanceof Error ? err : new Error(String(err));
                    setError(error);
                    fireGlobalError(error);
                } finally {
                    setWorking(false);
                }
            })();
        };
    }, [fn, api]);

    return [executor, working, result, error];
};
