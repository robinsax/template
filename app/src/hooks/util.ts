/**
*   Misc. utility hooks.
*/
import { WheelEvent, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useToast } from "@chakra-ui/react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { marked } from "marked";

import { AsyncCallback, IDBCache, openIDBCache } from "@/util";

import { APIError } from "./api";
import { useI18n } from "./i18n";
import { useAuthControlOrNull } from "./auth";

/**
*   Async wrapper for effects with error catching.
*
*   Does NOT support cleanups.
*/
export const useAsyncEffect = (fn: () => Promise<void>, deps: unknown[]) => {
    useEffect(() => {
        fn().catch(console.error); // eslint-disable-line
    }, deps);
};

/**
*   `useCallback` wrapper for async callbacks. Handles error toasts and provides a
*   working state flag.
*/
export const useAsyncCallback = <T = never>(
    fn: (param: T) => Promise<void>,
    deps: unknown[]
): [AsyncCallback<T>, boolean] => {
    const t = useI18n();
    const toast = useToast();
    const authControl = useAuthControlOrNull();

    const [working, setWorking] = useState(false);

    const handler = useCallback((async (param: T) => {
        setWorking(true);

        try {
            await fn(param);
        }
        catch (err) {
            const wasAuthExpiryAndCanLogOut = (
                err instanceof APIError &&
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

            toast({
                status: "error",
                description: t("An error occurred.")
            });
            console.error(err); // eslint-disable-line
        }
        finally {
            setWorking(false);
        }
    }) as unknown as (param: T) => void, deps);

    return [handler, working] as [AsyncCallback<T>, boolean];
};

/**
*   `useState` wrapper that stores the state value in `localStorage`.
*/
export const useSavedState = <T>(key: string, defaultValue: T) => {
    const initValue = useMemo(() => {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);

        return defaultValue;
    }, []);

    const [value, setValue] = useState<T>(initValue);

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [value]);
    
    return [value, setValue] as const;
};

/**
*   An index state for tab or steps groups that maps to a query parameter with the given
*   key, where each index is represented in the query string with the corresponding entry
*   in `values`.
*
*   For example, allows a tab group to add, and respect, `?tab=my-tab` in the page URL.
*/
export const useQueryIndexState = (key: string, values: string[]) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const index = Math.max(0, values.indexOf(searchParams.get(key) || ""));

    const onChange = (index: number) => {
        navigate("?" + key + "=" + values[index]);
    };

    return { index, onChange };
};

/**
*   Hook wrapper for `marked`.
*/
export const useMarkdown = (markdown: string) => {
    return useMemo(() => marked(markdown) as string, [markdown]);
};

type WindowEventName = keyof WindowEventMap;
type EventType<T extends WindowEventName> = WindowEventMap[T];

/**
*   Hook to register a window-level event listener until unmount.
*/
export const useWindowListener = <K extends WindowEventName>(
    event: K, fn: (event: EventType<K>) => void
) => {
    useEffect(() => {
        window.addEventListener(event, fn);

        return () => {
            window.removeEventListener(event, fn);
        };
    }, [fn, event]);
};

/**
*   Returns a counter that increases from 0 at a rate of `coef` while `active` is true.
*
*   Useful for animations.
*/
export const useContinuousTick = ({ coef, active }: {
    coef: number,
    active: boolean
}) => {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!active) return;

        const rate = 25;
        let stop = false;

        let t = 0;
        (async () => {
            while (true) {
                if (stop) return;

                setValue(t += rate * coef);

                await new Promise(resolve => setTimeout(resolve, rate));
            }
        })();

        return () => {
            stop = true;
        };
    }, [active]);

    return value;
};

/**
*   Return a function to retrieve a {@link IDBCache} with automatic cleanup.
*/
export const useIDBCache = <T>(name: string): () => Promise<IDBCache<T>> => {
    const ref = useRef<IDBCache<T>>(null);

    useEffect(() => {
        return () => {
            if (ref.current) ref.current.close();
        };
    }, []);

    return useCallback(async () => {
        if (!ref.current) ref.current = await openIDBCache<T>(name);

        return ref.current;
    }, []);
};

/**
*   Returns an `onWheel` event listener that will invoke `onChange` with either `1` or
*   `-1` when scroll X gestures are detected.
*/
export const useScrollXGestureListener = (
    onChange: (delta: number) => void,
    deps: unknown[]
) => {
    const deltaRef = useRef(0);
    const resetTimeoutRef = useRef<unknown | null>(null);
    const pauseRef = useRef(false);

    return useCallback((event: WheelEvent) => {
        if (pauseRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clear = () => clearTimeout(resetTimeoutRef.current as any);

        clear();
        resetTimeoutRef.current = setTimeout(() => {
            deltaRef.current = 0;
        }, 200);
        
        deltaRef.current += event.deltaX;
        if (Math.abs(deltaRef.current) > 80) {
            onChange(deltaRef.current < 0 ? -1 : 1);

            deltaRef.current = 0;
            clear();

            pauseRef.current = true;
            setTimeout(() => {
                pauseRef.current = false;
            }, 200);
        }
    }, deps);
};

/**
*   Returns a function to scroll an element into view with smooth behavior.
*
*   Only works within sidebar screens.
*/
export const useScrollTo = () => {
    return useCallback((anchor: string) => {
        const scrollTarget = document.getElementById("main-scroll-area");
        const element = document.getElementById(anchor);
        if (!scrollTarget || !element) return;

        setTimeout(() => {
            const elRect = element.getBoundingClientRect();
            const containerRect = scrollTarget.getBoundingClientRect();
            const relativeTop = elRect.top - containerRect.top + scrollTarget.scrollTop;

            const isOffscreen = (
                elRect.top < containerRect.top ||
                elRect.bottom > containerRect.bottom - (containerRect.height / 2)
            );
            if (!isOffscreen) return;

            scrollTarget.scrollTo({
                top: relativeTop - 100,
                behavior: "smooth",
            });
        }, 500);
    }, []);
};

/**
*   Manages a navigation-link behavior based on a query parameter. Use this for in-screen
*   modals and equivalent.
*
*   Returns callbacks to start and end the behavior, which invoke the respected provided
*   callbacks after setting the query parameter.
*
*   If the query parameter becomes present by some other navigation, the `onStart`
*   callback is invoked.
*/
export const useQueryParamBehavior = (
    key: string, anchorValue: string, onStart: () => void, onEnd: () => void
) => {
    const scrollTo = useScrollTo();

    const activeRef = useRef(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const paramValue = searchParams.get(key);

    useEffect(() => {
        if (paramValue != anchorValue) {
            if (activeRef.current) {
                onEnd();
                activeRef.current = false;
            }
            return;
        }

        if (activeRef.current) return;

        scrollTo(anchorValue);
        onStart();
        activeRef.current = true;
    }, [onStart, anchorValue, paramValue]);

    const start = useCallback(() => {
        setSearchParams(prev => {
            prev.set(key, anchorValue);
            return prev;
        });
    }, []);
    const end = useCallback(() => {
        setSearchParams(prev => {
            prev.delete(key);
            return prev;
        });
    }, []);

    return [start, end] as const;
};
