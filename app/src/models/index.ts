/**
*   Data model definitions, the majority of which are code generated from `kedet/backend`
*   type definitions 
*/
export * from "./backend";
export * from "./schemas";

import {
    State, BusinessModel, ClientModel, OrganizationUserGrantModel, VideoSlotSpecModel,
    UserGrantBusinessModel, UserGrantClientModel, UserGrantModel, ImageSlotSpecModel,
    CampaignValidationError, CampaignValidationWarning, TextSlotSpecModel,
    CTASlotSpecModel, URLSlotSpecModel, OrganizationSummaryModel, cTAs
} from "./backend";

import languages from "@common/languages.json";

export { languages };

// Correct messed up code-gen cases.
export const ctas = cTAs;

// Rename for usage as "State" is too generic.
export type ModelState = State;

/**
*   Authorization scope representation equivalent to the one in `kedet/backend`.
*/
export type AuthzScope = {
    clientId: string | null,
    businessId: string | null
};

/**
*   Bound type for generics accepting any model type.
*/
export type BaseModel = {
    id: string
};

// Commonly used unions.
export type AnyUserGrantModel = UserGrantModel | OrganizationUserGrantModel;
export type AnyClientModel = ClientModel | UserGrantClientModel;
export type AnyBusinessModel = BusinessModel | UserGrantBusinessModel;
export type AnyFullOrganizationModel = ClientModel | BusinessModel;
export type AnyOrganizationModel = (
    AnyClientModel | AnyBusinessModel | OrganizationSummaryModel
);

export type AnyCampaignValidation = CampaignValidationError | CampaignValidationWarning;
export type AnySlotSpecModel = (
    TextSlotSpecModel | VideoSlotSpecModel | ImageSlotSpecModel |
    CTASlotSpecModel | URLSlotSpecModel
);
