/**
*   Data model type definitions.
*/
export * from "./backend";
import languages from "@common/languages.json";

export { languages };

/**
*   Bound type for generics accepting any model type.
*/
export type BaseModel = {
    id: string
};
