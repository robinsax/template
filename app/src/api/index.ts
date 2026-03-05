/**
*   API client hook and provider. 
*/
import { binding } from "./binding";
import { APIClientBase, createAPIClientBase } from "./base";

export * from "./base";

/**
*   The code generated endpoints bindings of the API.
*/
export type APIBinding = ReturnType<typeof binding>;

/**
*   The API client. Calls should be made through the automatically generated binding in
*   almost all cases.
* 
*   Rich types like datetimes are automatically converted.
*/
export type APIClient = APIClientBase & APIBinding;

export const createAPIClient = () => {
    const base = createAPIClientBase();

    return { ...base, ...binding(base) } as APIClient;
};
