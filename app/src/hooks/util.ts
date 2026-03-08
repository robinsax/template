/**
*   Misc. utility hooks.
*/
import { useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { IDBCache, openIDBCache } from "@/util";
import { RouteKey } from "@/routing";

type WindowEventName = keyof WindowEventMap;
type EventType<T extends WindowEventName> = WindowEventMap[T];

export const useSetRoute = () => {
    const navigate = useNavigate();

    const setRoute = useCallback((route: RouteKey) => {
        navigate(route);
    }, [navigate]);

    return setRoute;
};

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
