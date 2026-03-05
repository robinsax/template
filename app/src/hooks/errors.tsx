import { useEffect } from "react";
const globalErrorHandlers: ((err: Error) => void)[] = [];

export const fireGlobalError = (err: Error) => {
    for (const handler of globalErrorHandlers) {
        handler(err);
    }
};

export const useGlobalErrorHandler = (handler: (err: Error) => void) => {
    useEffect(() => {
        globalErrorHandlers.push(handler);

        return () => {
            const index = globalErrorHandlers.indexOf(handler);
            if (index >= 0) {
                globalErrorHandlers.splice(index, 1);
            }
        };
    }, [handler]);
};
