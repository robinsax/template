/**
*   Hooks for fetching state from the API.
*/
import React, {
    ReactNode, useCallback, useState, createContext, useContext, useMemo, useEffect,
    useRef
} from "react";
import { Alert, useInterval, useToast } from "@chakra-ui/react";

import { UploadModel, Permission } from "@/models";
import { error } from "@/util";
// Exact to prevent import cycle:
import { FullAreaSpinner } from "@/components/common/layouts";

import { APIClient, APIError, useAPI } from "./api";
import { useAsyncEffect, useIDBCache } from "./util";
import { useAuthControlOrNull, useCurrentUserOrNull } from "./auth";
import { QueryKey, InvalidationScope } from "./invalidation";
import { useLocale, useI18n } from "./i18n";
import { useAuthzCheck } from "./authz";

export type FetchFn<T> = (api: APIClient) => Promise<T>;

export type FetchedStateOptions = {
    inactive?: boolean,
    pollInterval?: number
};

/**
*   Returns state fetched from the API using the given `fetch` function, and an
*   invalidation function to trigger refetch.
*
*   See {@link FetchedStateOptions}.
*
*   Note that this will return `null` until the initial fetch is complete. During
*   refetches the previous value remains until the fetch is complete (it does not become
*   `null`).
*/
export const useFetchedState = <T,>(
    fetch: FetchFn<T> | null, options: FetchedStateOptions = {}
) => {
    const api = useAPI();
    const [locale] = useLocale();
    const authControl = useAuthControlOrNull();
    const toast = useToast();
    const t = useI18n();

    const [state, setState] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [revision, setRevision] = useState<number>(0);

    useAsyncEffect(async () => {
        if (options.inactive || !fetch) return;

        try {
            setState(await fetch(api));
        } catch (err) {
            const wasAuthExpiryAndCanLogOut = (
                (err instanceof APIError) &&
                err.detail == "invalid_auth" &&
                authControl
            );
            if (wasAuthExpiryAndCanLogOut) {
                authControl.resetState();
                toast({
                    status: "warning",
                    description: t("You\"ve been logged out.")
                });
                return;
            }

            setError(err instanceof APIError ? err.detail : "unknown");

            throw err;
        }
    }, [api, revision, options.inactive, locale]);

    const invalidate = useCallback((replacer?: (data: T | null) => T) => {
        if (replacer) setState(replacer);

        setRevision(revision => revision + 1);
    }, []);

    useInterval(() => {
        if (options.inactive) return;

        setRevision(revision => revision + 1);
    }, options.pollInterval || null);

    return (
        [state, invalidate, error]
    ) as [T | null, () => void, string | null];
};

export type FetchedUploadOptions = {
    resetOnChange?: boolean
};

/**
*   Returns the data URI of the given `upload`. Will return `null`, without attempting
*   to fetch, while the passed `upload` is `null`.
*
*   Note this will return `null` until the upload is fetched and processed.
*/
export const useFetchedUpload = (
    upload: UploadModel | null, options: FetchedUploadOptions = {}
) => {
    const api = useAPI();

    const [dataURI, setDataURI] = useState<string | null>(null);

    const getCache = useIDBCache<{ dataURI: string }>("uploads");

    useAsyncEffect(async () => {
        if (!upload) {
            setDataURI(null);
            return;
        }

        if (options.resetOnChange) {
            setDataURI(null);
        }

        const cache = await getCache();
        let cached = await cache.get(upload.id);
        if (!cached) {
            const response = await (
                api.uploads.type(upload.type).id(upload.id).get()
            );

            const reader = new FileReader();
            const ready = new Promise<Event>((resolve, reject) => {
                reader.addEventListener("load", resolve);
                reader.addEventListener("error", reject);
            });
            reader.readAsDataURL(await response.blob());

            await ready;

            cached = { dataURI: reader.result as string };
            await cache.put(upload.id, cached);
        }

        setDataURI(cached.dataURI);
    }, [upload ? upload.id : null, upload ? upload.type : null, options.resetOnChange]);
    
    return dataURI;
};

/**
*   Factory for a component system that provides a state from {@link useFetchedState}.
*   The returned provider also mounts a corresponding {@link InvalidationScope}.
*
*   The fetch function can be passed either to the factory or to the provider render.
* 
*   Caller should rename the returned provider and hooks.
*/
export const createFetchedStateContext = <T,>(defaultFetch?: FetchFn<T>) => {
    const context = createContext<T | null>(null);

    const Provider = ({
        children, fetch: fetchProp, rev, spinnerUntilReady, spinnerHeight, queryKey,
        permission, unauthorizedPlaceholder, onUpdate, onReceive
    }: {
        children: ReactNode,
        queryKey: QueryKey,
        fetch?: FetchFn<T>,
        rev?: unknown,
        onReceive?: (data: T) => T,
        onUpdate?: (state: T) => void,
        spinnerUntilReady?: boolean,
        spinnerHeight?: string,
        permission?: Permission,
        unauthorizedPlaceholder?: T
    }) => {
        const t = useI18n();

        const user = useCurrentUserOrNull();

        const authorized = useAuthzCheck(permission || null);

        let fetch = useMemo(() => fetchProp ? fetchProp : defaultFetch, [fetchProp]);
        if (!fetch) {
            fetch = error(
                "no fetch function provided",
                (async () => []) as unknown as FetchFn<T>
            );
        }

        const [state, invalidate, fetchError] = useFetchedState(fetch, {
            inactive: !user || !authorized
        });

        const firstRenderRef = useRef(true);

        useEffect(() => {
            if (firstRenderRef.current) {
                firstRenderRef.current = false;
                return;
            }

            // Cull undefined revs.
            if (rev === undefined) return;

            invalidate();
        }, [rev]);

        useEffect(() => {
            if (onUpdate && state) onUpdate(state);
        }, [state, onUpdate]);

        const processedState = useMemo(() => {
            if (!state) return null;

            return onReceive ? onReceive(state) : state;
        }, [state, onReceive]); 

        return (
            !authorized ? (
                unauthorizedPlaceholder ? (
                    <context.Provider value={ unauthorizedPlaceholder }>
                        { children }
                    </context.Provider>
                ) : (
                    <Alert status="error">
                        { t("You do not have permission to view this content.") }
                    </Alert>
                )
            ) : fetchError ? (
                <Alert status="error">
                    { t("Failed to load some data: err_{case}.", {
                        case: fetchError
                    }) }
                </Alert>
            ) : processedState ? (
                <InvalidationScope
                    invalidate={ invalidate }
                    queryKey={ queryKey }
                >
                    <context.Provider value={ processedState }>
                        { children }
                    </context.Provider>
                </InvalidationScope>
            ) : (
                spinnerUntilReady ? (
                    <FullAreaSpinner height={ spinnerHeight }/>
                ) : (
                    children
                )
            )
        );
    };

    const useProvidedStateOrNull = () => useContext(context);
    const useProvidedState = () => useContext(context) as T;

    const DirectProvider = context.Provider;

    return { Provider, DirectProvider, useProvidedStateOrNull, useProvidedState };
};
