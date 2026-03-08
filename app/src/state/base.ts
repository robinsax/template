import config from "@/config";
import { deepEqual } from "@/util";
import { APIClient } from "@/api-client";

type QueryState<R, P = null> = {
    fn: QueryFn<R, P>,
    dependents: QueryState<unknown, unknown>[],
    param: P,
    loading: boolean,
    listeners: (() => void)[],
    waiters: (() => void)[],
    data: R | null,
    error: Error | null
};

export type ImmediateQueryExecFn = <R, P = null>(
    fn: QueryFn<R, P>, ...args: P extends null ? [] : [param: P]
) => Promise<R>;

export type QueryContext = {
    api: APIClient,
    query: ImmediateQueryExecFn
};

export type QueryFn<R, P = null> = (
    (context: QueryContext, param: P) => Promise<R> | R
);

export type MutationContext = QueryContext & {
    invalidate: <P = null>(
        queryFn: QueryFn<unknown, P>,
        matchParam?: (param: P) => boolean
    ) => void
};

export type MutationFn<P, R = void> = (
    context: MutationContext, param: P
) => Promise<R> | R;

export type QueryListener<R> = (
    (value: R | null, error: Error | null, loading: boolean) => void
);

export type StateEngine = {
    queryImmediate: <R, P = null>(
        fn: QueryFn<R, P>, ...args: P extends null ? [] : [param: P]
    ) => R | null,
    queryOnce: ImmediateQueryExecFn,
    queryListen: (
        (<R>(fn: QueryFn<R, never>, listener: QueryListener<R>) => () => void) &
        (<R, P>(fn: QueryFn<R, P>, listener: QueryListener<R>, param: P) => () => void)
    ),
    mutate: <P, R = void>(
        fn: MutationFn<P, R>, param: P
    ) => Promise<R>
};

export const createStateEngine = (api: APIClient): StateEngine => {
    const states: QueryState<unknown, unknown>[] = [];

    if (config.devMode) (window as unknown as Record<string, unknown>).states = states;

    const getQueryState = <R, P>(fn: QueryFn<R, P>, param: P): QueryState<R, P> => {
        for (const state of states) {
            if (state.fn == fn && deepEqual(state.param, param)) {
                return state as QueryState<R, P>;
            }
        }

        const newState: QueryState<R, P> = {
            fn,
            dependents: [],
            param: param,
            loading: false,
            listeners: [],
            waiters: [],
            data: null,
            error: null
        };
        states.push(newState as QueryState<unknown, unknown>);

        return newState;
    };

    const invalidate = <P = null>(
        queryFn: QueryFn<unknown, P>,
        matchParam: ((param: P) => boolean) | null = null
    ) => {
        const stateEntries = states.filter(check => (
            check.fn == queryFn &&
            (!matchParam || matchParam(check.param as P))
        ));

        const toFire: QueryState<unknown, unknown>[] = [];
        const queueFire = (entry: QueryState<unknown, unknown>) => {
            if (toFire.includes(entry)) return;

            toFire.push(entry);
        };

        for (const stateEntry of stateEntries) {
            queueFire(stateEntry);

            for (const dep of stateEntry.dependents) {
                queueFire(dep);
            }
        }

        (async () => {
            for (const refireEntry of toFire) {
                await runQuery(refireEntry);
            }
        })();
    };

    const queryImmediate = <R, P = null>(
        fn: QueryFn<R, P>, ...args: P extends null ? [] : [param: P]
    ): R | null => {
        const param = args[0] as P;
        const state = getQueryState(fn, param);

        return state.data;
    };

    const runQuery = async <R, P = null>(state: QueryState<R, P>) => {
        state.loading = true;
        state.listeners.forEach(listener => listener());

        const query = async <R, P = null>(
            fn: QueryFn<R, P>, ...args: P extends null ? [] : [param: P]
        ) => {
            const param = args[0] as P;
            const dependencyState = getQueryState(fn, param);

            dependencyState.dependents.push(state as QueryState<unknown, unknown>);

            return await queryOnce(fn, ...args);
        };

        const context: QueryContext = { api, query };

        try {
            const result = await state.fn(context, state.param);
            state.data = result;
            state.error = null;
        } catch (err) {
            state.data = null;
            state.error = err instanceof Error ? err : new Error(String(err));
        } finally {
            state.loading = false;
            state.listeners.forEach(listener => listener());
            state.waiters.forEach(waiter => waiter());
            state.waiters = [];
        }
    };

    const queryOnce = async <R, P = null>(
        fn: QueryFn<R, P>, ...args: P extends null ? [] : [param: P]
    ): Promise<R> => {
        const param = args[0] as P;
        const state = getQueryState(fn, param);

        if (!state.data && !state.error) {
            const done = new Promise<void>(resolve => state.waiters.push(resolve));
            if (!state.loading) runQuery(state);
            await done;
        }

        if (state.data) return state.data;
        throw state.error;
    };

    const queryListen = (<R, P = null>(
        fn: QueryFn<R, P>,
        listener: (value: R | null, error: Error | null, loading: boolean) => void,
        ...args: P extends null ? [] : [param: P]
    ) => {
        const state = getQueryState(fn, args[0] as P);

        const innerListener = () => {
            listener(state.data, state.error, state.loading);
        };
        state.listeners.push(innerListener);

        if (!state.data && !state.error && !state.loading) {
            runQuery(state);
        } else {
            innerListener();
        }

        return () => {
            state.listeners = state.listeners.filter(check => check != innerListener);
        };
    }) as StateEngine["queryListen"];

    const mutate = async <P, R = void>(
        fn: MutationFn<P, R>, param: P
    ) => {
        const context: MutationContext = {
            api, invalidate, query: queryOnce
        };

        return await fn(context, param);
    };

    return { queryOnce, queryImmediate, queryListen, mutate };
};
