/**
*   WebSocket hooks.
*/
import { useEffect, useRef, useMemo } from "react";

import config from "@/config";
import { AuthWSParams } from "@/model";
import { queryAuthState } from "@/state";

import { useQuery } from "./state";

/**
*   Options for {@link useWebSocket}.
*/
export type UseWebSocketOptions<R> = {
    /**
    *   Called when a message is received from the server.
    */
    onReceive: (data: R) => void,
    /**
    *   Called when a connection error occurs.
    */
    onConnectionError?: () => void
};

export type WSSendFn<T> = (data: T) => void;

export const useWebSocket = <T, R>(
    endpoint: string,
    { onReceive, onConnectionError }: UseWebSocketOptions<R>
): WSSendFn<T> => {
    const [authState] = useQuery(queryAuthState);

    const socketRef = useRef<WebSocket | null>(null);
    const hasAuthenticatedRef = useRef(false);

    const txQueueRef = useRef<T[]>([]);

    useEffect(() => {
        const url = config.apiRootUrl.replace("http", "ws") + endpoint;

        const socket = new WebSocket(url);

        socket.addEventListener("message", (event) => {
            onReceive(JSON.parse(event.data));
        });

        socket.addEventListener("error", () => {
            if (onConnectionError) onConnectionError();
        });

        socket.addEventListener("open", () => {
            socketRef.current = socket;

            for (const data of txQueueRef.current) {
                socket.send(JSON.stringify(data));
            }
            txQueueRef.current = [];
        });

        return () => socket.close();
    }, []);

    const send = useMemo(() => async (data: T) => {
        if (!socketRef.current) {
            txQueueRef.current.push(data);
            return;
        }

        socketRef.current.send(JSON.stringify(data));
    }, []);

    useEffect(() => {
        if (!authState || hasAuthenticatedRef.current) return;

        const authMessage: AuthWSParams = { token: authState.token };
        send(authMessage as unknown as T);
        hasAuthenticatedRef.current = true;
    }, [authState]);

    return send;
};
