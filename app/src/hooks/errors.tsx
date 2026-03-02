import { useEffect } from "react";

import { getGlobalScope } from "@/util";

const getErrorHandlers = (): ((err: Error) => void)[] => {
    const globalScope = getGlobalScope<{ __queryErrorHandlers?: ((err: Error) => void)[] }>();
    if (!globalScope.__queryErrorHandlers) {
        globalScope.__queryErrorHandlers = [];
    }

    return globalScope.__queryErrorHandlers;
};

export const fireGlobalError = (err: Error) => {
    const handlers = getErrorHandlers();

    for (const handler of handlers) {
        handler(err);
    }
};

export const useGlobalErrorHandler = (handler: (err: Error) => void) => {
    useEffect(() => {
        const handlers = getErrorHandlers();

        handlers.push(handler);

        return () => {
            const index = handlers.indexOf(handler);
            if (index >= 0) {
                handlers.splice(index, 1);
            }
        };
    }, [handler]);
};
