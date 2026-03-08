/**
*   Non-component-tree utilities. 
*/
import { Navigate } from "react-router-dom";
import { parse as uuidParse, stringify as uuidStringify } from "uuid";
import { format } from "date-fns";

import { RouteKey, routes } from "@/routing";
import config from "@/config";

// Misc.
/**
*   A callback that takes 0 or 1 parameters.
*/
export type Callback<T = never> = [T] extends [never] ? () => void : (value: T) => void;

/**
*   An async callback that takes 0 or 1 parameters.
*/
export type AsyncCallback<T = never> = (
    [T] extends [never] ? () => Promise<void> : (value: T) => Promise<void>
);

export const reroute = (href: RouteKey) => {
    return <Navigate to={ routes[href] } />;
};

/**
*   Returns a callback that invokes each of the returned callback in sequence.
*/
export const mergeCallbacks = <T = never>(...callbacks: Callback<T>[]) => {
    return (
        (value: T) => {
            for (const callback of callbacks) callback(value);
        }
    ) as Callback<T>;
};

export const deepEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;

    if (typeof a != "object" || typeof b != "object" || a == null || b == null) {
        return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length != keysB.length) return false;

    for (const key of keysA) {
        if (!keysB.includes(key)) return false;

        const innerEqual = deepEqual(
            (a as Record<string, unknown>)[key],
            (b as Record<string, unknown>)[key]
        );
        if (!innerEqual) return false;
    }

    return true;
};

/**
*   Suspends async execution for the specified number of milliseconds.
*/
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// URL slugging.
const BASE_62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE_SIZE = BigInt(BASE_62.length);

/**
*   Encodes a BigInt into base62 string.
*/
const base62Encode = (num: bigint): string => {
    if (num === BigInt(0)) return BASE_62[0];

    let str = "";
    while (num > BigInt(0)) {
        const rem = num % BASE_SIZE;
        num = num / BASE_SIZE;
        str = BASE_62[Number(rem)] + str;
    }

    return str;
};

/**
*   Decodes a base62 string into BigInt.
*/
const base62Decode = (str: string): bigint | null => {
    let num = BigInt(0);
    for (const char of str) {
        const val = BASE_62.indexOf(char);
        if (val == -1) return null;
        num = num * BASE_SIZE + BigInt(val);
    }

    return num;
};

/**
*   Encodes a UUID into a more URL-friendly representation.
*/
export const idToUrlForm = (uuid: string) => {
    const bytes = uuidParse(uuid);
    let result = BigInt(0);
    for (const byte of bytes) {
        result = (result << BigInt(8)) + BigInt(byte);
    }

    return base62Encode(result);
};

/**
*   Decodes a URL-friendly representation of a UUID from {@link idToUrlForm} back into
*   standard UUID form.
*/
export const urlFormToId = (urlForm: string) => {
    let num = base62Decode(urlForm);
    if (!num) return null;

    const bytes = new Uint8Array(16);
    for (let i = 15; i >= 0; i--) {
        bytes[i] = Number(num & BigInt(0xff));
        num >>= BigInt(8);
    }

    return uuidStringify(bytes);
};

// Random.
/**
*   Returns a simple seeded random number generator.
*/
export const seededRng = (seed: number) => {
    const m = 0x80000000;
    const a = 1103515245;
    const c = 12345;

    let state = seed;
    return () => {
        state = (a * state + c) % m;
        return state / (m - 1);
    };
};

// Formatters.
/**
*   Formats a number as a currency value in Canadian dollars with configurable
*   presentation.
*/
export const formatCurrencyCAD = (value: number, opts?: {
    symbol?: boolean,
    denomination?: boolean,
    forceCents?: boolean,
    noCents?: boolean
}) => {
    let str = value.toLocaleString();
    if (str.includes(".")) {
        const parts = str.split(".");
        if (parts[1].length > 2) {
            parts[1] = parts[1].slice(0, 2);
        }
        if (parts[1].length < 2) {
            parts[1] = parts[1] + "0";
        }
        str = parts[0] + "." + parts[1];
    }
    else if (opts?.forceCents) {
        str += ".00";
    }

    if (opts?.noCents) {
        str = str.split(".")[0];
    }

    if (opts?.symbol) str = "$" + str;
    if (opts?.denomination) str += " CAD";

    return str;
};

/**
*   Return a formatted string representing a size in bytes.
*/
export const formatByteSize = (size: number) => {
    const units = ["B", "KB", "MB", "GB"];

    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return size.toFixed(1) + " " + units[unitIndex];
};

/**
*   Returns a minimal, human-friendly date string for the given `date`.
*/
export const smartDateFormat = (date: Date, truncateLongMonths: boolean = false) => {
    const now = new Date();

    let month = format(date, "MMMM");
    if (truncateLongMonths && month.length > 5) {
        month = month.slice(0, 3);
    }

    if (date.getFullYear() == now.getFullYear()) {
        return month + " " + format(date, "do");
    }

    return month + " " + format(date, "do, yyyy");
};

// Error handling.
/**
*   Catch-all type for first-party error cases.
*/
export class AppError extends Error {};

/**
*   Throws in dev mode and returns with a fallback value in production.
*/
export const throwOrFallback = <T = unknown>(
    message: string, rv: T = null as unknown as T
): T => {
    if (config.devMode) throw new AppError(message);

    console.error(message); // eslint-disable-line no-console
    return rv;
};

// IndexedDB wrapper.
/**
*   IndexedDB wrapper for caching.
*/
export type IDBCache<T> = {
    get: (key: string) => Promise<T | null>,
    put: (key: string, value: T) => Promise<void>,
    close: () => void
};

/**
*   Opens a {@link Cache}.
*/
export const openIDBCache = async <T,>(name: string): Promise<IDBCache<T>> => {
    const open = indexedDB.open(name, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(name);

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
        open.onerror = () => reject(open.error);
        open.onsuccess = () => resolve(open.result);
    });

    const get = async (key: string) => {
        const tx = db.transaction(name, "readonly");
        const store = tx.objectStore(name);
        const request = store.get(key);

        return await new Promise<T | null>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    };

    const put = async (key: string, value: T) => {
        const tx = db.transaction(name, "readwrite");
        const store = tx.objectStore(name);
        const request = store.put(value, key);

        return await new Promise<void>((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    };

    const close = () => db.close();

    return { get, put, close };
};
