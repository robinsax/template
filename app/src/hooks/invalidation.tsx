/**
*   State invalidation system. Used for synchronizing state with API. Works as follows:
*
*   State owner component allocates state, usually via {@link useFetchedState}, and
*   mounts an {@link InvalidationScope} with a `queryKey`.
*
*   When any component below that mount point calls the {@link useInvalidate}
*   callback with that `queryKey`, it will invalidate that state, usually triggering
*   refetch.
*
*   On hot paths, a `queryReplacer` can be provided that replaces the state
*   with some known value while refetch is pending. Usually this known value would be a
*   PUT / POST response body. Leveraging this is not required, it"s a performance
*   optimization. When `queryReplacer` is specified for a key, do not include it in
*   `queryKeys`.
*
*   Note the set of supported query keys is defined in this module, which is necessary
*   for type safety.
*/
import React, {
    ReactNode, useCallback, useMemo, useContext, createContext
} from "react";

import {
    ClientModel, UserModel, AdPlatformOAuthTokenModel, CampaignModel,
    AssetModel, AdModel, CommentModel, NotificationModel
} from "@/models";
import config from "@/config";

// Query key definitions - must be updated to add new invalidatable state.
/**
*   The comprehensive set of query keys that exist.
*/
export type QueryKey = (
    "clients" |
    "users" |
    "adPlatforms" |
    "campaign" |
    "campaigns" |
    "campaignAssets" |
    "campaignAds" |
    "comments" |
    "notifications"
);

type QueryTypes = {
    clients: ClientModel[],
    users: UserModel[],
    adPlatforms: AdPlatformOAuthTokenModel[],
    campaign: CampaignModel,
    campaigns: CampaignModel[],
    campaignAssets: AssetModel[],
    campaignAds: AdModel[],
    comments: CommentModel[],
    notifications: NotificationModel[]
};

type QueryType<T extends QueryKey> = QueryTypes[T];

/**
*   An entry in {@link InvalidationParams.replacers} defining an immediate data update
*   while refetch is pending.
*/
export type QueryReplacer<T extends QueryKey = QueryKey> = {
    update: QueryType<T> extends Array<unknown> ? ("setItem" | "removeItem") : "set",
    data: QueryType<T> extends Array<infer U> ? U : QueryType<T>
};

/**
*   Parameters to the {@link useInvalidate} callback.
*
*   `queryKeys` specifies the queries to invalidate.
*   `queryReplacers` is an optional performance optimization that can be used to replace
*   state with some known value while refetch is pending.
*
*   Note if you define a replacer for a query key, you do not need to include it in
*   `queryKeys`.
*/
export type InvalidationParams = {
    queryKeys: QueryKey[],
    queryReplacers?: Partial<{ [K in QueryKey]: QueryReplacer<K> }>
};

// Context.
type InvalidationContextMember = {
    invalidate: (replacer?: (prev: unknown) => unknown) => void,
    queryKey: QueryKey
};

const invalidationContext = createContext<InvalidationContextMember[]>([]);

/**
*   A provider that allows children to invalidate state owned by the mounter via
*   {@link useInvalidate}.
*
*   This is the canonical way to keep state synchronized with the API - all components
*   that fetch and broadcast state mount a corresponding instance of this provider.
*/
export const InvalidationScope = ({ children, queryKey, invalidate }: {
    children: ReactNode,
    queryKey: QueryKey,
    invalidate: (replacer?: (prev: unknown) => unknown) => void
}) => {
    const parent = useContext(invalidationContext);

    const member = useMemo(() => ({ invalidate, queryKey }), [invalidate, queryKey]);

    return (
        <invalidationContext.Provider value={ [...parent, member] }>
            { children }
        </invalidationContext.Provider>
    );
};

/**
*   Returns a function that triggers invalidation of {@link InvalidationScope}s above
*   the caller"s mount point.
* 
*   Call this after performing an API call that changed something relevant within the
*   current component tree.
*
*   See {@link InvalidationParams}.
*/
export const useInvalidate = () => {
    const scope = useContext(invalidationContext);

    return useCallback((params: InvalidationParams) => {
        if (config.devMode) {
            // eslint-disable-next-line no-console
            console.debug("Invalidate: ", {
                keys: params.queryKeys,
                replacers: params.queryReplacers,
                scope
            });
        }

        let invalidateCount = 0;
        let replaceCount = 0;
        for (const member of scope) {
            // Check culling if possible.
            if (params.queryKeys.includes(member.queryKey)) {
                member.invalidate();
                invalidateCount++;
            }

            // Execute immediate replacement if applicable.
            if (!params.queryReplacers) continue;

            const replacer = params.queryReplacers[member.queryKey];
            if (!replacer) continue;

            const replace = (prev: unknown) => {
                if (replacer.update == "set") {
                    return replacer.data;
                }
                else if (replacer.update == "setItem") {
                    let replaced = false;
                    const updated = (prev as unknown[]).map(item => {
                        // @ts-expect-error ts(2339)
                        if (item.id == replacer.data.id) {
                            replaced = true;
                            return replacer.data;
                        }

                        return item;
                    });

                    if (!replaced) {
                        updated.push(replacer.data);
                    }

                    return updated;
                }
                else if (replacer.update == "removeItem") {
                    return (prev as unknown[]).filter(item => (
                        // @ts-expect-error ts(2339)
                        item.id != replacer.data.id
                    ));
                }
            };

            member.invalidate(replace);
            replaceCount++;
        }

        if (config.devMode) {
            // eslint-disable-next-line no-console
            console.debug("Invalidate result: ", {
                invalidateCount,
                replaceCount
            });
        }
    }, [scope]);
};
