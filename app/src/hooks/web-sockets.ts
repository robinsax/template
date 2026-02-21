/**
*   WebSocket hooks.
*/
import { useEffect, useRef, useMemo, useState } from 'react';

import config from '@/config';
import {
    AIChatMessageWSParams, AIChatMessageWSResp, AIChatStartWSParams, AIChatStartWSResp,
    AIChatSyncWSResp, AuthWSParams
} from '@/models';

import { useCurrentAuthToken } from './auth';

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

// Internal WebSocket binding.
const useWebSocket = <T, R>(
    endpoint: string,
    { onReceive, onConnectionError }: UseWebSocketOptions<R>
): WSSendFn<T> => {
    const authToken = useCurrentAuthToken();

    const socketRef = useRef<WebSocket | null>(null);

    const txQueueRef = useRef<T[]>([]);

    useEffect(() => {
        const url = config.apiRootUrl.replace('http', 'ws') + endpoint;

        const socket = new WebSocket(url);

        socket.addEventListener('message', (event) => {
            onReceive(JSON.parse(event.data));
        });

        socket.addEventListener('error', () => {
            if (onConnectionError) onConnectionError();
        });

        socket.addEventListener('open', () => {
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
        const authMessage: AuthWSParams = { token: authToken };
        send(authMessage as unknown as T);
    }, []);

    return send;
};

export type AIChatParams = AIChatMessageWSParams;
export type AIChatResp = AIChatMessageWSResp;

export type UseAIChatSocketOptions = (
    {
        topic: string,
        objectId?: string | null
    } &
    UseWebSocketOptions<AIChatResp>
);

/**
*   Returns handles on an AI chat WebSocket:
*   - `send`: A function to send messages to the server.
*   - `chatId`: The ID of the chat, if it has been created.
*   - `synchronized`: Whether `onReceive` has been called with the full message history.
* 
*   The initial authentication and chat start transactions are handled automatically -
*   the chat can be assumed to be in the chat loop transaction (see API documentation for
*   `/ai-chat`) once `chatId` is not `null` and `synchronized` is `true`.
*/
export const useAIChatSocket = (
    { topic, objectId, onReceive, ...options }: UseAIChatSocketOptions
) => {
    const [chatId, setChatId] = useState<string | null>(null);
    const [synchronized, setSynchronized] = useState(false);

    const send = useWebSocket<
        AIChatParams | AIChatStartWSParams,
        AIChatResp | AIChatStartWSResp | AIChatSyncWSResp
    >('/ai-chat', {
        onReceive: (data) => {
            if ('chat_id' in data) {
                setChatId(data.chat_id);
                return;
            }

            if ('synced' in data) {
                setSynchronized(true);
                return;
            }

            onReceive(data);
        },
        ...options
    });

    useEffect(() => {
        send({ topic, object_id: objectId || null });
    }, []);

    return (
        [send, chatId, synchronized] as [WSSendFn<AIChatParams>, string | null, boolean]
    );
};
