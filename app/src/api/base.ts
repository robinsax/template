/**
*   API client internals. 
*/
import config from "@/config";

/**
*   Thrown when an API call fails.
*/
export class APIError extends Error {
    detail: string;

    constructor(detail: string) {
        super(detail);
        this.detail = detail;
    }
};

export type APICallMethod = "get" | "post" | "put" | "delete";

export type RawAPICallParams = {
    path: string,
    method: APICallMethod,
    body?: unknown
};

/**
*   API call configuration options.
*/
export type APICallOptions = {
    authToken?: string | null,
    query?: Record<string, string | number>,
    rawResp?: boolean,
    onProgress?: (progress: number | null) => void
};

export type APIClientBase = {
    setLocale(locale: string): void,
    setAuthToken(token: string | null): void,
    /**
    *   Make an API call without type checking.
    * 
    *   This should almost never be used by application code.
    */
    call: <T>(
        params: RawAPICallParams,
        options?: APICallOptions
    ) => Promise<T>
}

// Endpoint-client value conversions.
const convertFromAPI = (input: unknown, suspectDate: boolean = false): unknown => {
    if (!input) return input;

    if (suspectDate && typeof input === "string") {
        return new Date(input);
    }

    if (input instanceof Array) {
        return input.map(item => convertFromAPI(item));
    }

    if (input && typeof input == "object") {
        const obj: Record<string, unknown> = { ...input };
        for (const [key, value] of Object.entries(obj)) {
            obj[key] = convertFromAPI(
                value,
                key.endsWith("_at") || key.endsWith("_date")
            );
        }

        return obj;
    }

    return input;
};

const convertForAPI = (input: unknown): unknown => {
    if (!input || typeof input != "object") return input;

    const obj: Record<string, unknown> = { ...input };
    for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Date) {
            obj[key] = value.toISOString();
        }
        else if (value instanceof Array) {
            obj[key] = value.map(convertForAPI);
        }
        else if (value && typeof value == "object") {
            obj[key] = convertForAPI(value);
        }
    }

    return obj;
};

/**
*   Create and return the base API client implementation with which the binding will be
*   implemented.
*/
export const createAPIClientBase = (): APIClientBase => {
    let locale: string | null = null;
    let authToken: string | null = null;

    const setLocale = (newLocale: string) => {
        locale = newLocale;
    };

    const setAuthToken = (token: string | null) => {
        authToken = token;
    };

    const processRespBody = <T>(respBody: Record<string, unknown>, status: number) => {
        if (status != 200) throw new APIError(respBody.error as string);

        return convertFromAPI(respBody) as T;
    };

    const call = async <T,>(
        params: RawAPICallParams,
        options: APICallOptions = {}
    ) => {
        const headers: Record<string, string> = {};
        const extParams: Record<string, unknown> = {};

        let body: ReadableStream | string | undefined;
        let query = "";

        // Solve auth.
        const reqAuth = options.authToken || authToken;
        if (reqAuth) headers["Authorization"] = reqAuth;

        if (locale) headers["X-Locale"] = locale;

        // Solve URL.
        if (options.query) {
            const parts = [];
            for (const key in options.query) {
                parts.push(key + "=" + options.query[key]);
            }

            query = "?" + parts.join("&");
        }

        const url = config.apiRootUrl + params.path + query;

        // Handle body.
        if (params.body) {
            if (params.body instanceof File) {
                const file = params.body;

                // Use XHR because fetch ReadableStream requires ALPN which isn't
                // possible on localhost, and split configs suck.
                const xhr = new XMLHttpRequest();
                xhr.open(params.method, url);
                for (const [key, value] of Object.entries(headers)) {
                    xhr.setRequestHeader(key, value);
                }

                xhr.upload.addEventListener("progress", (e) => {
                    if (options.onProgress) options.onProgress(e.loaded / e.total);
                });

                const resolver = new Promise(resolve => {
                    xhr.addEventListener("load", resolve);
                });

                const formData = new FormData();
                formData.append("file", file);
                xhr.send(formData);

                await resolver;

                return processRespBody<T>(JSON.parse(xhr.response), xhr.status);
            }
            else {
                headers["Content-Type"] = "application/json";

                body = JSON.stringify(convertForAPI(params.body));
            }
        }

        // Dispatch fetch.
        const resp = await fetch(url, {
            method: params.method,
            headers,
            body,
            ...extParams
        });

        if (options.rawResp) return resp as unknown as T;

        const respBody = await resp.json();

        return processRespBody<T>(respBody, resp.status);
    };

    return { setLocale, setAuthToken, call };
};
