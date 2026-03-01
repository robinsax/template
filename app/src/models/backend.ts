/** This file is auto-generated. Do not modify it. */
/* eslint-disable max-len */
export type AIChatMessageModel = {
    id: string,
    chat_id: string,
    content: string,
    role: AIChatMessageRole,
    state: (AIChatStateModel | null),
    suggestions: (AIChatSuggestionModel[] | null)
};

export type AIChatMessageRole = ("user" | "model");

export const aIChatMessageRoles: AIChatMessageRole[] = ["user", "model"];

export type AIChatModel = {
    id: string,
    user_id: string,
    topic: string,
    messages: AIChatMessageModel[],
    related_object_id: (string | null),
    related_object_type: (string | null)
};

export type AIChatStateModel = {
    key: string,
    data: (Record<string, unknown> | null)
};

export type AIChatSuggestionModel = {
    key: string,
    value: unknown
};

export type AIFindingDataModel = {
    description: string,
    rationale: (string | null),
    expected_impact: (string | null),
    summary: (string | null),
    supporting_metrics: (Record<string, number> | null)
};

export type AdChannelModel = {
    icon: string,
    label: string,
    detail: string,
    recommendations: AdChannelRecommendationsModel,
    spend_constraints: SpendConstraintsModel,
    brief_constraints: BriefConstraintsModel,
    location_support: LocationSupportModel,
    ad_spec: AdSpecModel
};

export type AdChannelRecommendationsModel = {
    min_runtime: number,
    industries: Industry[],
    objectives: Objective[]
};

export type AdModel = {
    id: (string | null),
    campaign_id: string,
    channel_id: string,
    location_ids: string[],
    slots: AdSlotModel[],
    validation: AdValidationModel
};

export type AdPlatformModel = {
    key: string,
    icon: string,
    label: string,
    detail: string,
    options: Record<string, AdChannelModel>
};

export type AdPlatformOAuthTokenModel = {
    id: string,
    client_id: string,
    business_id: (string | null),
    platform: AdPlatformModel,
    user: UserModel,
    disabled: boolean
};

export type AdSlotAssetAssignmentModel = {
    asset_id: string,
    validation: SlotAssetValidationModel
};

export type AdSlotModel = {
    slot_key: string,
    slot_assets: ((AdSlotAssetAssignmentModel | null)[] | null)
};

export type AdSpecCompositeGroupModel = {
    slot_keys: string[],
    optional_slot_keys: string[]
};

export type AdSpecModel = {
    slots: (TextSlotSpecModel | ImageSlotSpecModel | VideoSlotSpecModel | CTASlotSpecModel | URLSlotSpecModel)[],
    composite_groups: (AdSpecCompositeGroupModel[] | null)
};

export type AdValidationError = ("invalid_assets" | "not_enough_assets" | "too_many_assets" | "pool_too_small" | "pool_too_large" | "view_objective_non_video_creative" | "google_ads_rsa_sitelink_domain_mismatch" | "google_ads_rda_youtube_url_invalid" | "google_dv360_invalid_caption_url" | "snapchat_brand_name_required" | "meta_invalid_feed_image_aspect_ratio" | "meta_invalid_story_card_count" | "meta_invalid_reels_carousel_video" | "meta_cta_missing_for_objective" | "pinterest_invalid_video_carousel" | "pinterest_invalid_image_carousel" | "amazon_dsp_invalid_video_duration");

export const adValidationErrors: AdValidationError[] = ["invalid_assets", "not_enough_assets", "too_many_assets", "pool_too_small", "pool_too_large", "view_objective_non_video_creative", "google_ads_rsa_sitelink_domain_mismatch", "google_ads_rda_youtube_url_invalid", "google_dv360_invalid_caption_url", "snapchat_brand_name_required", "meta_invalid_feed_image_aspect_ratio", "meta_invalid_story_card_count", "meta_invalid_reels_carousel_video", "meta_cta_missing_for_objective", "pinterest_invalid_video_carousel", "pinterest_invalid_image_carousel", "amazon_dsp_invalid_video_duration"];

export type AdValidationModel = {
    valid: boolean,
    errors: AdValidationError[]
};

export type AgeRange = ("age_18_24" | "age_25_34" | "age_35_44" | "age_45_54" | "age_55_64" | "age_65_plus");

export const ageRanges: AgeRange[] = ["age_18_24", "age_25_34", "age_35_44", "age_45_54", "age_55_64", "age_65_plus"];

export type AssetModel = {
    id: string,
    campaign_id: string,
    type: AssetType,
    upload: (UploadModel | null),
    text: (string | null),
    slot_pools: SlotPoolAssetAssignmentModel[],
    location_ids: string[],
    audit_summary: AuditSummaryModel
};

export type AssetType = ("video" | "image" | "headline" | "description" | "cta" | "url");

export const assetTypes: AssetType[] = ["video", "image", "headline", "description", "cta", "url"];

export type AuditModel = {
    id: string,
    user: UserModel,
    target_type: string,
    target_id: string,
    occurred_at: Date,
    event: string,
    params: (Record<string, unknown> | null)
};

export type AuditStandaloneModel = {
    id: string,
    user: UserModel,
    occurred_at: Date,
    event: string,
    target_type: string,
    target_summary: unknown
};

export type AuditSummaryModel = {
    created_by: (UserModel | string),
    created_at: Date,
    last_updated_at: Date,
    last_updated_by: (UserModel | string)
};

export type AuthKeyModel = {
    user_id: string,
    created_at: Date,
    expires_at: Date,
    revoked_at: (Date | null),
    restriction: (AuthKeyRestriction | null)
};

export type AuthKeyRestriction = ("asset_get" | "invitation" | "password_reset");

export const authKeyRestrictions: AuthKeyRestriction[] = ["asset_get", "invitation", "password_reset"];

export type AuthzScopeType = ("global" | "client" | "business");

export const authzScopeTypes: AuthzScopeType[] = ["global", "client", "business"];

export type BasicAuditEvent = ("create" | "update" | "delete");

export const basicAuditEvents: BasicAuditEvent[] = ["create", "update", "delete"];

export type BrandSafety = ("derogatory" | "downloads_sharing" | "gambling" | "violence" | "suggestive" | "profanity" | "drugs_alcohol" | "political" | "young_audiences" | "mature_audiences");

export const brandSafeties: BrandSafety[] = ["derogatory", "downloads_sharing", "gambling", "violence", "suggestive", "profanity", "drugs_alcohol", "political", "young_audiences", "mature_audiences"];

export type BriefConstraintsModel = {
    objective: (BriefValuesConstraintModel<Objective> | null),
    brand_safety: (BriefValuesConstraintModel<BrandSafety> | null),
    age_range: (BriefValuesConstraintModel<AgeRange> | null),
    gender: (BriefValuesConstraintModel<Gender> | null),
    relationship_status: (BriefValuesConstraintModel<RelationshipStatus> | null),
    relationship_interest: (BriefValuesConstraintModel<RelationshipInterest> | null),
    target_audience: (BriefValuesConstraintModel<TargetAudience> | null),
    device: (BriefValuesConstraintModel<Device> | null),
    location_presence: (BriefValuesConstraintModel<LocationPresence> | null)
};

export type BriefValuesConstraintModel<T> = {
    type: BriefValuesConstraintType,
    values: (T[] | null),
    revision_locked: boolean
};

export type BriefValuesConstraintType = ("blocklist" | "allowlist" | "field_unsupported");

export const briefValuesConstraintTypes: BriefValuesConstraintType[] = ["blocklist", "allowlist", "field_unsupported"];

export type BudgetAllocation = ("fixed" | "intelligent");

export const budgetAllocations: BudgetAllocation[] = ["fixed", "intelligent"];

export type BusinessMetaModel = {
    industry: (Industry | null),
    description: (string | null)
};

export type BusinessModel = {
    industry: (Industry | null),
    description: (string | null),
    id: string,
    client_id: string,
    name: string,
    state: State,
    meta: BusinessMetaModel,
    avatar_id: (string | null),
    avatar: (UploadModel | null),
    embedded_reports: EmbeddedReportModel[],
    grants: OrganizationUserGrantModel[]
};

export type CTA = ("learn_more" | "shop_now" | "sign_up" | "download" | "apply_now" | "contact_us" | "watch_now" | "book_now" | "visit_site" | "get_quote" | "subscribe" | "see_more");

export const cTAs: CTA[] = ["learn_more", "shop_now", "sign_up", "download", "apply_now", "contact_us", "watch_now", "book_now", "visit_site", "get_quote", "subscribe", "see_more"];

export type CTASlotSpecModel = {
    key: string,
    label: string,
    asset_type: AssetType,
    pool_count_range: ([number, number] | null),
    slot_count_range: [number, number],
    options: CTA[]
};

export type CampaignAnalysisFindingModel = {
    id: string,
    campaign_id: string,
    analysis_id: string,
    channel_id: string,
    type: CampaignAnalysisFindingType,
    priority: CampaignAnalysisPriority,
    source: CampaignAnalysisSource,
    sentiment: CampaignAnalysisSentiment,
    data: (AIFindingDataModel | null)
};

export type CampaignAnalysisFindingType = ("low_ctr" | "low_cpc" | "low_cpa" | "low_cpm" | "low_roas" | "high_ctr" | "high_cpc" | "high_cpa" | "high_cpm" | "high_roas" | "insight" | "recommendation" | "prediction");

export const campaignAnalysisFindingTypes: CampaignAnalysisFindingType[] = ["low_ctr", "low_cpc", "low_cpa", "low_cpm", "low_roas", "high_ctr", "high_cpc", "high_cpa", "high_cpm", "high_roas", "insight", "recommendation", "prediction"];

export type CampaignAnalysisModel = {
    id: string,
    campaign_id: string,
    created_at: Date,
    priority: CampaignAnalysisPriority,
    sentiment: CampaignAnalysisSentiment,
    findings: CampaignAnalysisFindingModel[]
};

export type CampaignAnalysisPriority = ("low" | "high");

export const campaignAnalysisPriorities: CampaignAnalysisPriority[] = ["low", "high"];

export type CampaignAnalysisSentiment = ("positive" | "neutral" | "negative");

export const campaignAnalysisSentiments: CampaignAnalysisSentiment[] = ["positive", "neutral", "negative"];

export type CampaignAnalysisSource = ("rule" | "ai");

export const campaignAnalysisSources: CampaignAnalysisSource[] = ["rule", "ai"];

export type CampaignAnalysisSummaryModel = {
    id: string,
    created_at: Date,
    priority: CampaignAnalysisPriority,
    sentiment: CampaignAnalysisSentiment
};

export type CampaignAuditEvent = ("create" | "brief_update" | "locations_update" | "channels_update" | "assets_update" | "ads_update" | "status_update" | "archive" | "dearchive");

export const campaignAuditEvents: CampaignAuditEvent[] = ["create", "brief_update", "locations_update", "channels_update", "assets_update", "ads_update", "status_update", "archive", "dearchive"];

export type CampaignBriefModel = {
    objective: (Objective | null),
    start_date: (Date | null),
    end_date: (Date | null),
    budget: (number | null),
    budget_allocation: (BudgetAllocation | null),
    target_audience: (TargetAudience[] | null),
    device: (Device[] | null),
    language: (string | null),
    brand_safety: (BrandSafety[] | null),
    gender: (Gender[] | null),
    age_range: (AgeRange[] | null),
    relationship_interest: (RelationshipInterest[] | null),
    relationship_status: (RelationshipStatus[] | null),
    location_presence: (LocationPresence | null)
};

export type CampaignChannelBudgetExtensionAllocationModel = {
    locations: Record<string, number>
};

export type CampaignChannelBudgetExtensionModel = {
    id: string,
    channel_id: string,
    dollar_value: number,
    audit_summary: AuditSummaryModel,
    allocations: CampaignChannelBudgetExtensionAllocationModel
};

export type CampaignChannelLocationValidationError = ("not_enough_ads" | "invalid_ads" | "invalid_location" | "short_daily_budget");

export const campaignChannelLocationValidationErrors: CampaignChannelLocationValidationError[] = ["not_enough_ads", "invalid_ads", "invalid_location", "short_daily_budget"];

export type CampaignChannelLocationValidationModel = {
    valid: boolean,
    location_id: string,
    errors: CampaignChannelLocationValidationError[]
};

export type CampaignChannelModel = {
    id: string,
    campaign_id: string,
    channel_key: string,
    channel: AdChannelModel,
    budget_allocation: number,
    paused: boolean,
    has_ads: boolean,
    validation: CampaignChannelValidationModel,
    spend_info: CampaignChannelSpendModel,
    status: (CampaignChannelStatus | null),
    pre_revision_status: (CampaignChannelStatus | null),
    publish_pending: boolean,
    budget_extensions: CampaignChannelBudgetExtensionModel[]
};

export type CampaignChannelOrchestrationRunModel = {
    id: string,
    channel_id: string,
    started_at: Date,
    ended_at: (Date | null),
    error: (boolean | null),
    type: CampaignChannelOrchestrationRunType,
    steps: CampaignChannelOrchestrationRunStepsModel
};

export type CampaignChannelOrchestrationRunStepsModel = {
    steps: CampaignChannelOrchestrationStep[]
};

export type CampaignChannelOrchestrationRunType = ("publish" | "poll_review");

export const campaignChannelOrchestrationRunTypes: CampaignChannelOrchestrationRunType[] = ["publish", "poll_review"];

export type CampaignChannelOrchestrationStep = ("auth" | "complete" | "push_campaign" | "push_brief" | "push_assets" | "push_ads" | "pull_campaign" | "pull_ads");

export const campaignChannelOrchestrationSteps: CampaignChannelOrchestrationStep[] = ["auth", "complete", "push_campaign", "push_brief", "push_assets", "push_ads", "pull_campaign", "pull_ads"];

export type CampaignChannelReviewDecision = ("approved" | "rejected");

export const campaignChannelReviewDecisions: CampaignChannelReviewDecision[] = ["approved", "rejected"];

export type CampaignChannelReviewModel = {
    ad_id: (string | null),
    location_id: (string | null),
    decision: CampaignChannelReviewDecision,
    error: (string | null),
    created_at: Date
};

export type CampaignChannelSpendModel = {
    budget_value: (number | null),
    daily_based_min_value: (number | null)
};

export type CampaignChannelStatus = ("error" | "published" | "approved" | "rejected" | "live" | "completed");

export const campaignChannelStatuses: CampaignChannelStatus[] = ["error", "published", "approved", "rejected", "live", "completed"];

export type CampaignChannelValidationError = ("incompatible_brief" | "invalid_locations_mix" | "invalid_locations" | "short_campaign_daily_budget" | "short_location_daily_budget" | "short_campaign_lifetime_budget" | "meta_missing_conversion_settings" | "tiktok_missing_customized_user" | "google_ads_rsa_multiple_ads_for_location" | "google_ads_rsa_missing_search_keywords" | "amazon_dsp_missing_product_categories" | "amazon_dsp_invalid_language");

export const campaignChannelValidationErrors: CampaignChannelValidationError[] = ["incompatible_brief", "invalid_locations_mix", "invalid_locations", "short_campaign_daily_budget", "short_location_daily_budget", "short_campaign_lifetime_budget", "meta_missing_conversion_settings", "tiktok_missing_customized_user", "google_ads_rsa_multiple_ads_for_location", "google_ads_rsa_missing_search_keywords", "amazon_dsp_missing_product_categories", "amazon_dsp_invalid_language"];

export type CampaignChannelValidationModel = {
    valid: boolean,
    channel_id: string,
    errors: CampaignChannelValidationError[],
    warnings: CampaignChannelValidationWarning[],
    locations: CampaignChannelLocationValidationModel[]
};

export type CampaignChannelValidationWarning = ("paused" | "incompatible_brief" | "discontinuous_age_range" | "google_dv360_audience_selected" | "snapchat_unsupported_language");

export const campaignChannelValidationWarnings: CampaignChannelValidationWarning[] = ["paused", "incompatible_brief", "discontinuous_age_range", "google_dv360_audience_selected", "snapchat_unsupported_language"];

export type CampaignLocationModel = {
    id: string,
    campaign_id: string,
    location_id: string,
    budget_allocation: number,
    location_taxonomy: LocationTaxonomyModel,
    audit_summary: AuditSummaryModel
};

export type CampaignModel = {
    id: string,
    business_id: string,
    name: string,
    status: CampaignStatus,
    pre_revision_status: (CampaignStatus | null),
    brief: CampaignBriefModel,
    archived: boolean,
    duration_days: (number | null),
    validation: CampaignValidationModel,
    ai_summary: (string | null),
    ai_summarized_at: (Date | null),
    publish_pending: boolean,
    revision: number,
    locations: CampaignLocationModel[],
    max_locations: number,
    channels: CampaignChannelModel[],
    reviews: CampaignReviewModel[],
    audit_summary: AuditSummaryModel,
    last_analysis_summary: (CampaignAnalysisSummaryModel | null)
};

export type CampaignReviewDecision = ("approved" | "request_changes");

export const campaignReviewDecisions: CampaignReviewDecision[] = ["approved", "request_changes"];

export type CampaignReviewModel = {
    id: string,
    campaign_id: string,
    user: UserModel,
    created_at: Date,
    revision: number,
    decision: CampaignReviewDecision
};

export type CampaignStatus = ("draft" | "review" | "published" | "revision" | "live" | "completed");

export const campaignStatuses: CampaignStatus[] = ["draft", "review", "published", "revision", "live", "completed"];

export type CampaignSummaryModel = {
    id: string,
    name: string,
    archived: boolean,
    status: CampaignStatus,
    ai_summary: (string | null)
};

export type CampaignValidationError = ("brief_incomplete" | "invalid_duration" | "duplicate_locations" | "asset_validation" | "channel_validation" | "short_budget" | "validation_failed");

export const campaignValidationErrors: CampaignValidationError[] = ["brief_incomplete", "invalid_duration", "duplicate_locations", "asset_validation", "channel_validation", "short_budget", "validation_failed"];

export type CampaignValidationModel = {
    valid: boolean,
    errors: CampaignValidationError[],
    warnings: CampaignValidationWarning[]
};

export type CampaignValidationWarning = ("launch_grace" | "unused_assets" | "pool_asset_validation" | "channel_brief_validation" | "dev_mode_invalid_duration");

export const campaignValidationWarnings: CampaignValidationWarning[] = ["launch_grace", "unused_assets", "pool_asset_validation", "channel_brief_validation", "dev_mode_invalid_duration"];

export type ClientModel = {
    id: string,
    name: string,
    state: State,
    businesses: BusinessModel[],
    avatar_id: (string | null),
    avatar: (UploadModel | null),
    embedded_reports: EmbeddedReportModel[],
    grants: OrganizationUserGrantModel[]
};

export type CommentModel = {
    id: string,
    subtarget_id: (string | null),
    subtarget_type: (string | null),
    user: UserModel,
    content: string,
    created_at: Date,
    reactions: Partial<Record<CommentReactionType, string[]>>
};

export type CommentReactionType = ("like" | "dislike");

export const commentReactionTypes: CommentReactionType[] = ["like", "dislike"];

export type CommentTreeModel = {
    depth: number,
    comment: CommentModel,
    children: CommentTreeModel[]
};

export type Device = ("mobile" | "desktop" | "tablet" | "connected_tv");

export const devices: Device[] = ["mobile", "desktop", "tablet", "connected_tv"];

export type EmbeddedReportModel = {
    id: string,
    client_id: string,
    business_id: (string | null),
    name: string,
    url: string
};

export type Gender = ("male" | "female" | "unknown");

export const genders: Gender[] = ["male", "female", "unknown"];

export type ImageSlotSpecModel = {
    key: string,
    label: string,
    asset_type: AssetType,
    pool_count_range: ([number, number] | null),
    slot_count_range: [number, number],
    options: MediaSlotSpecOptionModel[],
    content_types: string[],
    size_range: [number, number]
};

export type Industry = ("ecommerce" | "business_services" | "real_estate" | "media" | "food_and_beverage" | "financial_services" | "non_profit" | "travel" | "retail" | "insurance" | "hospitality" | "health_and_wellness" | "mobile_app" | "sports_and_fitness" | "conservation" | "technology" | "education" | "public_sector" | "entertainment" | "manufacturing");

export const industries: Industry[] = ["ecommerce", "business_services", "real_estate", "media", "food_and_beverage", "financial_services", "non_profit", "travel", "retail", "insurance", "hospitality", "health_and_wellness", "mobile_app", "sports_and_fitness", "conservation", "technology", "education", "public_sector", "entertainment", "manufacturing"];

export type LocationModel = {
    id: string,
    name: string,
    type: LocationType,
    code: string,
    parent_id: (string | null)
};

export type LocationPresence = ("currently_in" | "recently_in" | "interested_in");

export const locationPresences: LocationPresence[] = ["currently_in", "recently_in", "interested_in"];

export type LocationSupportModel = {
    country: (string[] | null),
    state: (string[] | null),
    city: (string[] | null),
    zip: (string[] | null),
    mixed_types: boolean
};

export type LocationTaxonomyModel = {
    type: LocationType,
    country: LocationModel,
    state: (LocationModel | null),
    city: (LocationModel | null),
    zip: (LocationModel | null)
};

export type LocationType = ("country" | "state" | "city" | "zip");

export const locationTypes: LocationType[] = ["country", "state", "city", "zip"];

export type LocationWithFeatureModel = {
    id: string,
    name: string,
    type: LocationType,
    code: string,
    parent_id: (string | null),
    feature: Record<string, unknown>
};

export type MediaSlotSpecModel = {
    key: string,
    label: string,
    asset_type: AssetType,
    pool_count_range: ([number, number] | null),
    slot_count_range: [number, number],
    options: MediaSlotSpecOptionModel[],
    content_types: string[],
    size_range: [number, number]
};

export type MediaSlotSpecOptionModel = {
    aspect_ratio: number,
    aspect_ratio_tolerance: (number | null),
    width_range: [number, number],
    size_range: ([number, number] | null)
};

export type NotificationEmailStatus = ("pending" | "skipped" | "error" | "sent");

export const notificationEmailStatuses: NotificationEmailStatus[] = ["pending", "skipped", "error", "sent"];

export type NotificationModel = {
    id: string,
    owner_id: string,
    occurred_at: Date,
    seen_at: (Date | null),
    type: NotificationType,
    user: (UserModel | null),
    target_type: (string | null),
    target_id: (string | null),
    cosmetic_metadata: (Record<string, string> | null)
};

export type NotificationType = ("invited" | "campaign_created" | "campaign_submitted" | "campaign_changes_requested" | "campaign_approved" | "campaign_published" | "campaign_channel_approved" | "campaign_channel_rejected" | "comment_reply" | "password_reset");

export const notificationTypes: NotificationType[] = ["invited", "campaign_created", "campaign_submitted", "campaign_changes_requested", "campaign_approved", "campaign_published", "campaign_channel_approved", "campaign_channel_rejected", "comment_reply", "password_reset"];

export type Objective = ("reach" | "traffic" | "video_views" | "community_interaction" | "lead_generation" | "website_conversions");

export const objectives: Objective[] = ["reach", "traffic", "video_views", "community_interaction", "lead_generation", "website_conversions"];

export type OrganizationSummaryModel = {
    id: string,
    name: string,
    client_id: (string | null),
    state: State,
    avatar: (UploadModel | null)
};

export type OrganizationUserGrantModel = {
    id: string,
    user_id: string,
    scope_type: AuthzScopeType,
    client_id: string,
    business_id: (string | null),
    role: Role,
    user: UserModel
};

export type Permission = ("manage_clients" | "manage_org" | "manage_iam" | "manage_oauths" | "view_campaign_contents" | "view_analytics" | "manage_briefs" | "manage_creatives" | "manage_campaigns");

export const permissions: Permission[] = ["manage_clients", "manage_org", "manage_iam", "manage_oauths", "view_campaign_contents", "view_analytics", "manage_briefs", "manage_creatives", "manage_campaigns"];

export type RelationshipInterest = ("men" | "women" | "unknown");

export const relationshipInterests: RelationshipInterest[] = ["men", "women", "unknown"];

export type RelationshipStatus = ("single" | "in_relationship" | "married" | "unknown");

export const relationshipStatuses: RelationshipStatus[] = ["single", "in_relationship", "married", "unknown"];

export type Role = ("admin" | "account_manager" | "campaign_manager" | "data_analyst" | "business_manager" | "manager" | "member");

export const roles: Role[] = ["admin", "account_manager", "campaign_manager", "data_analyst", "business_manager", "manager", "member"];

export type SlotAssetValidationError = ("unsupported_type" | "unsupported_dimension" | "unsupported_dimension_value" | "unsupported_size" | "unsupported_format" | "unsupported_pattern" | "unsupported_duration" | "unsupported_option" | "pending_processing");

export const slotAssetValidationErrors: SlotAssetValidationError[] = ["unsupported_type", "unsupported_dimension", "unsupported_dimension_value", "unsupported_size", "unsupported_format", "unsupported_pattern", "unsupported_duration", "unsupported_option", "pending_processing"];

export type SlotAssetValidationModel = {
    valid: boolean,
    errors: SlotAssetValidationError[]
};

export type SlotPoolAssetAssignmentModel = {
    channel_id: string,
    slot_key: string,
    validation: SlotAssetValidationModel
};

export type SlotSpecModel = {
    key: string,
    label: string,
    asset_type: AssetType,
    pool_count_range: ([number, number] | null),
    slot_count_range: [number, number]
};

export type SpendConstraintsModel = {
    campaign_min: number,
    campaign_min_daily: number,
    location_min_daily: number
};

export type StandaloneCampaignAnalysisFindingModel = {
    id: string,
    campaign_id: string,
    analysis_id: string,
    channel_id: string,
    type: CampaignAnalysisFindingType,
    priority: CampaignAnalysisPriority,
    source: CampaignAnalysisSource,
    sentiment: CampaignAnalysisSentiment,
    data: (AIFindingDataModel | null),
    campaign_summary: CampaignSummaryModel,
    analysis_summary: CampaignAnalysisSummaryModel
};

export type State = ("active" | "inactive");

export const states: State[] = ["active", "inactive"];

export type TargetAudience = ("online_stores" | "tech_and_gadgets" | "home_and_garden" | "pet_supplies_and_products" | "consumer_products" | "fashion_and_apparel" | "beauty_and_personal_care" | "sports_and_fitness_products" | "subscription_boxes" | "specialty_foods_and_drinks" | "automotive_parts_and_accessories");

export const targetAudiences: TargetAudience[] = ["online_stores", "tech_and_gadgets", "home_and_garden", "pet_supplies_and_products", "consumer_products", "fashion_and_apparel", "beauty_and_personal_care", "sports_and_fitness_products", "subscription_boxes", "specialty_foods_and_drinks", "automotive_parts_and_accessories"];

export type TextSlotSpecModel = {
    key: string,
    label: string,
    asset_type: AssetType,
    pool_count_range: ([number, number] | null),
    slot_count_range: [number, number],
    length_range: [number, number]
};

export type URLSlotSpecModel = {
    key: string,
    label: string,
    asset_type: AssetType,
    pool_count_range: ([number, number] | null),
    slot_count_range: [number, number],
    length_range: [number, number],
    verification_required: boolean,
    youtube_url: boolean
};

export type UploadImageMetadataModel = {
    width: number,
    height: number
};

export type UploadMediaMetadataModel = {
    width: number,
    height: number
};

export type UploadModel = {
    id: string,
    client_id: (string | null),
    business_id: (string | null),
    type: UploadType,
    filename: string,
    content_type: string,
    size: number,
    image_metadata: (UploadImageMetadataModel | null),
    video_metadata: (UploadVideoMetadataModel | null),
    thumbnail: (UploadModel | null),
    processing_aborted: (boolean | null)
};

export type UploadType = ("campaign_assets" | "avatars" | "thumbnails" | "platform_data");

export const uploadTypes: UploadType[] = ["campaign_assets", "avatars", "thumbnails", "platform_data"];

export type UploadVideoMetadataModel = {
    width: number,
    height: number,
    duration: number
};

export type UserGrantBusinessModel = {
    id: string,
    name: string,
    client_id: string,
    avatar: (UploadModel | null)
};

export type UserGrantClientModel = {
    id: string,
    name: string,
    state: State,
    avatar: (UploadModel | null)
};

export type UserGrantModel = {
    id: string,
    user_id: string,
    scope_type: AuthzScopeType,
    client_id: (string | null),
    business_id: (string | null),
    client: (UserGrantClientModel | null),
    business: (UserGrantBusinessModel | null),
    role: Role
};

export type UserModel = {
    id: string,
    name: string,
    type: UserType,
    state: State,
    email: string,
    is_claimed: boolean,
    avatar_id: (string | null),
    avatar: (UploadModel | null),
    grants: UserGrantModel[],
    locale: (string | null)
};

export type UserType = ("client" | "platform_owner");

export const userTypes: UserType[] = ["client", "platform_owner"];

export type VideoSlotSpecModel = {
    key: string,
    label: string,
    asset_type: AssetType,
    pool_count_range: ([number, number] | null),
    slot_count_range: [number, number],
    options: MediaSlotSpecOptionModel[],
    content_types: string[],
    size_range: [number, number],
    duration_range: [number, number]
};

export type AIChatMessageWSParams = {
    message: (string | null),
    state_transition: (AIChatStateTransitionWSParams | null)
};

export type AIChatMessageWSResp = {
    partial: (string | null),
    final: (AIChatMessageModel | null)
};

export type AIChatStartWSParams = {
    topic: string,
    object_id: (string | null)
};

export type AIChatStartWSResp = {
    chat_id: string
};

export type AIChatStateTransitionWSParams = {
    state: (AIChatStateModel | null)
};

export type AIChatSyncWSResp = {
    synced: boolean
};

export type AdParams = {
    slots: AdSlotAssetParams[],
    location_ids: string[]
};

export type AdSlotAssetParams = {
    slot_key: string,
    asset_ids: ((string | null)[] | null)
};

export type AddCampaignChannelParams = {
    assign_assets: (boolean | null)
};

export type AmazonChannelSettingsModel = {
    product_category_ids: string[]
};

export type AmazonChannelSettingsOptionsModel = {
    product_categories: AmazonProductCategoryModel[]
};

export type AmazonDSPAdvertiserModel = {
    id: string,
    name: string
};

export type AmazonDSPProfileModel = {
    id: string,
    name: string
};

export type AmazonManagerAccountModel = {
    id: string,
    name: string,
    advertisers: AmazonDSPAdvertiserModel[]
};

export type AmazonOAuthMetadataModel = {
    manager_accounts: AmazonManagerAccountModel[],
    profiles: AmazonDSPProfileModel[],
    active_advertiser_id: (string | null),
    active_profile_id: (string | null),
    product_categories: AmazonProductCategoryModel[]
};

export type AmazonProductCategoryModel = {
    name: string,
    sub_categories: AmazonProductSubCategoryModel[]
};

export type AmazonProductSubCategoryModel = {
    id: string,
    name: string
};

export type AnalyticsModel = {
    budget: number,
    totals: DailyMetricsModel,
    daily_metrics: DailyMetricsModel[],
    last_day_raw_trends: (RawAnalyticsTrendModel | null),
    last_day_computed_trends: (PerformanceMetricsModel | null),
    elapsed_time_percentage: number,
    current_daily_spend: number,
    target_daily_spend: number,
    projected_final_spend: number
};

export type AssetCopyParams = {
    source_id: string
};

export type AssetParams = {
    type: AssetType,
    upload_id: (string | null),
    text: (string | null),
    slot_pools: (AssetSlotPoolParams[] | null),
    location_ids: (string[] | null)
};

export type AssetSlotPoolParams = {
    channel_id: string,
    slot_key: string
};

export type AuthParams = {
    email: (string | null),
    password: (string | null),
    restriction: (AuthKeyRestriction | null)
};

export type AuthResp = {
    token: string,
    auth: AuthKeyModel
};

export type AuthWSParams = {
    token: string
};

export type BoundingBoxModel = {
    x: number,
    y: number,
    width: number,
    height: number
};

export type BudgetExtensionParams = {
    dollar_value: number,
    allocations: CampaignChannelBudgetExtensionAllocationModel
};

export type BusinessParams = {
    name: string,
    avatar_id: (string | null),
    industry: (Industry | null),
    description: (string | null)
};

export type CampaignArchiveStateParams = {
    archived: boolean
};

export type CampaignChannelPausedStateParams = {
    paused: boolean
};

export type CampaignCreateParams = {
    name: string
};

export type CampaignFixedBudgetAllocationParams = {
    allocations: Record<string, number>
};

export type CampaignReviewParams = {
    decision: CampaignReviewDecision
};

export type CampaignStatusUpdateParams = {
    status: CampaignStatus
};

export type ClientParams = {
    name: string,
    avatar_id: (string | null)
};

export type CommentCreateParams = {
    parent_id: (string | null),
    subtarget_type: (string | null),
    subtarget_id: (string | null),
    content: string
};

export type CommentEditParams = {
    content: string
};

export type DailyMetricsModel = {
    date: Date,
    raw: RawAnalyticsModel,
    computed: PerformanceMetricsModel
};

export type DisplayAdResp = {
    ad: AdModel,
    channel: CampaignChannelModel,
    assets: AssetModel[]
};

export type EmbeddedReportParams = {
    name: string,
    url: string
};

export type GoogleAdsChannelSettingsModel = {
    search_keywords: (GoogleAdsSearchKeyword[] | null)
};

export type GoogleAdsOAuthAccountTierModel = {
    customer_id: string,
    customer_name: string
};

export type GoogleAdsOAuthManageTierModel = {
    manager_id: (string | null),
    manager_name: (string | null),
    customers: GoogleAdsOAuthAccountTierModel[]
};

export type GoogleAdsOAuthMetadataModel = {
    managers: GoogleAdsOAuthManageTierModel[],
    contains_unhandled: boolean,
    active_manager_id: (string | null),
    active_customer_id: (string | null)
};

export type GoogleAdsSearchKeyword = {
    keyword: string,
    match_type: GoogleAdsSearchKeywordMatchType
};

export type GoogleAdsSearchKeywordMatchType = ("EXACT" | "PHRASE" | "BROAD");

export const googleAdsSearchKeywordMatchTypes: GoogleAdsSearchKeywordMatchType[] = ["EXACT", "PHRASE", "BROAD"];

export type GoogleDV360AccountModel = {
    id: string,
    name: string
};

export type GoogleDV360AudienceModel = {
    id: string,
    display_name: string
};

export type GoogleDV360ChannelSettingsModel = {
    targeting_method: GoogleDV360TargetingMethod,
    audience_ids: (string[] | null)
};

export type GoogleDV360ChannelSettingsOptionsModel = {
    targeting_methods: GoogleDV360TargetingMethod[],
    audiences: GoogleDV360AudienceModel[]
};

export type GoogleDV360OAuthMetadataModel = {
    partners: GoogleDV360AccountModel[],
    active_partner_id: string,
    active_partner_advertisers: GoogleDV360AccountModel[],
    active_advertiser_id: string,
    active_advertiser_audiences: GoogleDV360AudienceModel[]
};

export type GoogleDV360TargetingMethod = ("audience" | "retargeting" | "list" | "lookalike");

export const googleDV360TargetingMethods: GoogleDV360TargetingMethod[] = ["audience", "retargeting", "list", "lookalike"];

export type ImageEditParams = {
    crop_box: BoundingBoxModel,
    format: string,
    output_width: number,
    output_height: number,
    compression: (number | null)
};

export type ImageGenAspectRatioOption = ("1:1" | "3:4" | "4:3" | "9:16" | "16:9");

export const imageGenAspectRatioOptions: ImageGenAspectRatioOption[] = ["1:1", "3:4", "4:3", "9:16", "16:9"];

export type ImageGenMimeTypeOption = ("JPEG" | "PNG");

export const imageGenMimeTypeOptions: ImageGenMimeTypeOption[] = ["JPEG", "PNG"];

export type ImageGenOptionsModel = {
    image_size: ImageGenSizeOption,
    aspect_ratio: ImageGenAspectRatioOption,
    output_mime_type: ImageGenMimeTypeOption
};

export type ImageGenSizeOption = ("1K" | "2K");

export const imageGenSizeOptions: ImageGenSizeOption[] = ["1K", "2K"];

export type ImageGenerationParams = {
    type: AssetType,
    upload_id: (string | null),
    text: (string | null),
    slot_pools: (AssetSlotPoolParams[] | null),
    location_ids: (string[] | null),
    prompt: string,
    image_id: (string | null),
    options: (ImageGenOptionsModel | null)
};

export type LocationsEmbedResp = {
    api_key: string
};

export type MetaChannelSettingsModel = {
    pixel_id: (string | null),
    conversion_event_type: (MetaConversionEventType | null)
};

export type MetaChannelSettingsOptionsModel = {
    conversion_event_types: MetaConversionEventType[]
};

export type MetaConversionEventType = ("ADD_PAYMENT_INFO" | "ADD_TO_CART" | "ADD_TO_WISHLIST" | "CONTACT" | "CUSTOMIZE_PRODUCT" | "DONATE" | "FIND_LOCATION" | "INITIALIZE_CHECKOUT" | "LEAD" | "PURCHASE" | "SCHEDULE" | "SEARCH" | "START_TRIAL" | "SUBMIT_APPLICATION" | "SUBSCRIBE" | "VIEW_CONTENT");

export const metaConversionEventTypes: MetaConversionEventType[] = ["ADD_PAYMENT_INFO", "ADD_TO_CART", "ADD_TO_WISHLIST", "CONTACT", "CUSTOMIZE_PRODUCT", "DONATE", "FIND_LOCATION", "INITIALIZE_CHECKOUT", "LEAD", "PURCHASE", "SCHEDULE", "SEARCH", "START_TRIAL", "SUBMIT_APPLICATION", "SUBSCRIBE", "VIEW_CONTENT"];

export type MetaOAuthBusinessModel = {
    id: string,
    name: string,
    ad_accounts: MetaOAuthIdentityModel[],
    pages: MetaOAuthIdentityModel[],
    insta_accounts: MetaOAuthIdentityModel[]
};

export type MetaOAuthIdentityModel = {
    id: string,
    name: string
};

export type MetaOAuthMetadataModel = {
    businesses: MetaOAuthBusinessModel[],
    active_business_id: string,
    active_ad_account_id: string,
    active_page_id: string,
    active_insta_account_id: string,
    app_id: (string | null),
    app_store_url: (string | null)
};

export type NotificationsUpdateParams = {
    seen_ids: string[]
};

export type OAuthConsentURLResp = {
    url: string
};

export type PasswordResetRequestParams = {
    email: string
};

export type PerformanceMetricsModel = {
    cpa: (number | null),
    cpc: (number | null),
    cpm: (number | null),
    ctr: (number | null),
    roas: (number | null)
};

export type PinterestAdAccountModel = {
    id: string,
    name: string
};

export type PinterestOAuthMetadataModel = {
    ad_accounts: PinterestAdAccountModel[],
    user_account_id: string,
    active_ad_account_id: string
};

export type RawAnalyticsModel = {
    spend: number,
    impressions: (number | null),
    clicks: (number | null),
    conversions: (number | null),
    revenue: (number | null)
};

export type RawAnalyticsTrendModel = {
    spend: (number | null),
    impressions: (number | null),
    clicks: (number | null),
    conversions: (number | null),
    revenue: (number | null)
};

export type SnapchatOAuthIdentityModel = {
    id: string,
    name: string
};

export type SnapchatOAuthMetadataModel = {
    orgs: SnapchatOAuthOrgModel[],
    active_org_id: string,
    active_ad_account_id: string,
    active_profile_id: (string | null)
};

export type SnapchatOAuthOrgModel = {
    id: string,
    name: string,
    ad_accounts: SnapchatOAuthIdentityModel[],
    profiles: SnapchatOAuthIdentityModel[]
};

export type StateUpdateParams = {
    state: State
};

export type TextGenerationParams = {
    type: AssetType,
    upload_id: (string | null),
    text: (string | null),
    slot_pools: (AssetSlotPoolParams[] | null),
    location_ids: (string[] | null),
    prompt: string,
    asset_id: (string | null)
};

export type TikTokIdentityModel = {
    id: string,
    name: string
};

export type TikTokOAuthMetadataModel = {
    advertisers: TikTokIdentityModel[],
    active_advertiser_id: string,
    active_advertiser_custom_users: TikTokIdentityModel[],
    active_custom_user_id: (string | null)
};

export type UserClaimParams = {
    invite_token: string,
    password: string
};

export type UserGrantUpdateParams = {
    role: Role
};

export type UserInviteParams = {
    name: string,
    email: string,
    locale: string,
    type: UserType
};

export type UserPasswordUpdateParams = {
    reset_token: string,
    password: string
};

export type UserUpdateParams = {
    name: (string | null),
    locale: (string | null),
    avatar_id: (string | null)
};

export const permissionsMatrix: Record<Role, Partial<Record<Permission, boolean>>> = {
    admin: {
        manage_clients: true,
        manage_org: true,
        manage_iam: true,
        manage_oauths: true,
        view_campaign_contents: true,
        view_analytics: true,
        manage_briefs: true,
        manage_creatives: true,
        manage_campaigns: true    
    },
    account_manager: {
        manage_clients: true,
        manage_org: true,
        manage_briefs: true,
        manage_creatives: true,
        manage_campaigns: true,
        manage_iam: true,
        manage_oauths: true,
        view_campaign_contents: true,
        view_analytics: true    
    },
    campaign_manager: {
        manage_briefs: true,
        manage_creatives: true,
        manage_campaigns: true,
        manage_oauths: true,
        view_campaign_contents: true,
        view_analytics: true    
    },
    data_analyst: {
        view_analytics: true    
    },
    business_manager: {
        manage_org: true,
        manage_briefs: true,
        manage_creatives: true,
        manage_campaigns: true,
        manage_iam: true,
        manage_oauths: true,
        view_campaign_contents: true,
        view_analytics: true    
    },
    manager: {
        manage_briefs: true,
        manage_creatives: true,
        manage_campaigns: true,
        manage_oauths: true,
        view_campaign_contents: true,
        view_analytics: true    
    },
    member: {
        manage_briefs: true,
        manage_creatives: true,
        view_campaign_contents: true,
        view_analytics: true    
    }
};

export const roleScopes: Record<Role, AuthzScopeType[]> = {
    admin: ["global"],
    account_manager: ["global", "client", "business"],
    campaign_manager: ["global", "client", "business"],
    data_analyst: ["global", "client", "business"],
    business_manager: ["client", "business"],
    manager: ["client", "business"],
    member: ["business"]
};

export const roleUserTypes: Record<Role, UserType> = {
    admin: "platform_owner",
    account_manager: "platform_owner",
    campaign_manager: "platform_owner",
    data_analyst: "platform_owner",
    business_manager: "client",
    manager: "client",
    member: "client"
};
