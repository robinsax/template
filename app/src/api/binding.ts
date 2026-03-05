/** This file is auto-generated. Do not modify it. */
/* eslint-disable max-len */
import { UserModel, UserInviteParams, UserClaimParams, UserPasswordUpdateParams, UserUpdateParams, StateUpdateParams, NotificationModel, NotificationsUpdateParams, AuthParams, AuthResp, AuthKeyModel, PasswordResetRequestParams, ClientModel, ClientParams, BusinessParams, BusinessModel, EmbeddedReportParams, EmbeddedReportModel, Role, UserGrantUpdateParams, UserGrantModel, CampaignModel, CampaignChannelOrchestrationRunModel, CampaignChannelReviewModel, CampaignCreateParams, CampaignArchiveStateParams, CampaignBriefModel, CampaignFixedBudgetAllocationParams, AddCampaignChannelParams, CampaignChannelPausedStateParams, CampaignStatusUpdateParams, CampaignReviewParams, BudgetExtensionParams, LocationsEmbedResp, LocationTaxonomyModel, LocationWithFeatureModel, AssetModel, AssetParams, AssetCopyParams, TextGenerationParams, ImageGenerationParams, ImageEditParams, CommentTreeModel, CommentCreateParams, CommentEditParams, AdModel, AdParams, AdPlatformModel, AdPlatformOAuthTokenModel, OAuthConsentURLResp, UploadModel, AuditModel, AuditStandaloneModel, AnalyticsModel, CampaignAnalysisModel, StandaloneCampaignAnalysisFindingModel } from "@/model";

import { APIClientBase, APICallOptions } from "./base";

export const binding = (api: APIClientBase) => ({
    health: {
        get: (options?: APICallOptions): Promise<void> => (api.call({ path: `/health`, method: "get" }, options))    
    },
    users: {
        get: (options?: APICallOptions): Promise<UserModel[]> => (api.call({ path: `/users`, method: "get" }, options)),
        id: (user_id: string) => (({
            get: (options?: APICallOptions): Promise<UserModel> => (api.call({ path: `/users/${user_id}`, method: "get" }, options)),
            password: {
                put: (body: UserPasswordUpdateParams, options?: APICallOptions): Promise<UserModel> => (api.call({ path: `/users/${user_id}/password`, method: "put", body }, options))            
            },
            put: (body: UserUpdateParams, options?: APICallOptions): Promise<UserModel> => (api.call({ path: `/users/${user_id}`, method: "put", body }, options)),
            state: {
                put: (body: StateUpdateParams, options?: APICallOptions): Promise<UserModel> => (api.call({ path: `/users/${user_id}/state`, method: "put", body }, options))            
            },
            notifications: {
                get: (options?: APICallOptions): Promise<NotificationModel[]> => (api.call({ path: `/users/${user_id}/notifications`, method: "get" }, options)),
                put: (body: NotificationsUpdateParams, options?: APICallOptions): Promise<void> => (api.call({ path: `/users/${user_id}/notifications`, method: "put", body }, options))            
            }        
        })),
        post: (body: UserInviteParams, options?: APICallOptions): Promise<UserModel> => (api.call({ path: `/users`, method: "post", body }, options))    
    },
    invites: {
        post: (body: UserClaimParams, options?: APICallOptions): Promise<UserModel> => (api.call({ path: `/invites`, method: "post", body }, options))    
    },
    auth: {
        post: (body: AuthParams, options?: APICallOptions): Promise<AuthResp> => (api.call({ path: `/auth`, method: "post", body }, options)),
        put: (options?: APICallOptions): Promise<AuthKeyModel> => (api.call({ path: `/auth`, method: "put" }, options)),
        delete: (options?: APICallOptions): Promise<AuthKeyModel> => (api.call({ path: `/auth`, method: "delete" }, options)),
        passwordResets: {
            post: (body: PasswordResetRequestParams, options?: APICallOptions): Promise<void> => (api.call({ path: `/auth/password-resets`, method: "post", body }, options))        
        }    
    },
    clients: {
        get: (options?: APICallOptions): Promise<ClientModel[]> => (api.call({ path: `/clients`, method: "get" }, options)),
        id: (client_id: string) => (({
            get: (options?: APICallOptions): Promise<ClientModel> => (api.call({ path: `/clients/${client_id}`, method: "get" }, options)),
            put: (body: ClientParams, options?: APICallOptions): Promise<ClientModel> => (api.call({ path: `/clients/${client_id}`, method: "put", body }, options)),
            state: {
                put: (body: StateUpdateParams, options?: APICallOptions): Promise<ClientModel> => (api.call({ path: `/clients/${client_id}/state`, method: "put", body }, options))            
            },
            businesses: {
                post: (body: BusinessParams, options?: APICallOptions): Promise<BusinessModel> => (api.call({ path: `/clients/${client_id}/businesses`, method: "post", body }, options)),
                id: (business_id: string) => (({
                    put: (body: BusinessParams, options?: APICallOptions): Promise<BusinessModel> => (api.call({ path: `/clients/${client_id}/businesses/${business_id}`, method: "put", body }, options)),
                    users: {
                        id: (user_id: string) => (({
                            roleOptions: {
                                get: (options?: APICallOptions): Promise<Role[]> => (api.call({ path: `/clients/${client_id}/businesses/${business_id}/users/${user_id}/role-options`, method: "get" }, options))                            
                            },
                            put: (body: UserGrantUpdateParams, options?: APICallOptions): Promise<UserGrantModel> => (api.call({ path: `/clients/${client_id}/businesses/${business_id}/users/${user_id}`, method: "put", body }, options)),
                            delete: (options?: APICallOptions): Promise<void> => (api.call({ path: `/clients/${client_id}/businesses/${business_id}/users/${user_id}`, method: "delete" }, options))                        
                        }))                    
                    },
                    campaigns: {
                        post: (body: CampaignCreateParams, options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/clients/${client_id}/businesses/${business_id}/campaigns`, method: "post", body }, options))                    
                    },
                    adPlatforms: {
                        get: (options?: APICallOptions): Promise<AdPlatformModel[]> => (api.call({ path: `/clients/${client_id}/businesses/${business_id}/ad-platforms`, method: "get" }, options))                    
                    },
                    oauthTokens: {
                        id: (token_id: string) => (({
                            delete: (options?: APICallOptions): Promise<void> => (api.call({ path: `/clients/${client_id}/businesses/${business_id}/oauth-tokens/${token_id}`, method: "delete" }, options)),
                            integrationMetadata: {
                                get: (options?: APICallOptions): Promise<Record<string, unknown>> => (api.call({ path: `/clients/${client_id}/businesses/${business_id}/oauth-tokens/${token_id}/integration-metadata`, method: "get" }, options)),
                                put: (body: Record<string, unknown>, options?: APICallOptions): Promise<Record<string, unknown>> => (api.call({ path: `/clients/${client_id}/businesses/${business_id}/oauth-tokens/${token_id}/integration-metadata`, method: "put", body }, options))                            
                            }                        
                        }))                    
                    }                
                }))            
            },
            embeddedReports: {
                post: (body: EmbeddedReportParams, options?: APICallOptions): Promise<EmbeddedReportModel> => (api.call({ path: `/clients/${client_id}/embedded-reports`, method: "post", body }, options)),
                id: (report_id: string) => (({
                    put: (body: EmbeddedReportParams, options?: APICallOptions): Promise<EmbeddedReportModel> => (api.call({ path: `/clients/${client_id}/embedded-reports/${report_id}`, method: "put", body }, options)),
                    delete: (options?: APICallOptions): Promise<void> => (api.call({ path: `/clients/${client_id}/embedded-reports/${report_id}`, method: "delete" }, options))                
                }))            
            },
            users: {
                id: (user_id: string) => (({
                    roleOptions: {
                        get: (options?: APICallOptions): Promise<Role[]> => (api.call({ path: `/clients/${client_id}/users/${user_id}/role-options`, method: "get" }, options))                    
                    },
                    put: (body: UserGrantUpdateParams, options?: APICallOptions): Promise<UserGrantModel> => (api.call({ path: `/clients/${client_id}/users/${user_id}`, method: "put", body }, options)),
                    delete: (options?: APICallOptions): Promise<void> => (api.call({ path: `/clients/${client_id}/users/${user_id}`, method: "delete" }, options))                
                }))            
            },
            campaigns: {
                get: (options?: APICallOptions): Promise<CampaignModel[]> => (api.call({ path: `/clients/${client_id}/campaigns`, method: "get" }, options)),
                analyses: {
                    findings: {
                        get: (options?: APICallOptions): Promise<StandaloneCampaignAnalysisFindingModel[]> => (api.call({ path: `/clients/${client_id}/campaigns/analyses/findings`, method: "get" }, options))                    
                    }                
                }            
            },
            oauthTokens: {
                get: (options?: APICallOptions): Promise<AdPlatformOAuthTokenModel[]> => (api.call({ path: `/clients/${client_id}/oauth-tokens`, method: "get" }, options)),
                id: (token_id: string) => (({
                    delete: (options?: APICallOptions): Promise<void> => (api.call({ path: `/clients/${client_id}/oauth-tokens/${token_id}`, method: "delete" }, options)),
                    integrationMetadata: {
                        get: (options?: APICallOptions): Promise<Record<string, unknown>> => (api.call({ path: `/clients/${client_id}/oauth-tokens/${token_id}/integration-metadata`, method: "get" }, options)),
                        put: (body: Record<string, unknown>, options?: APICallOptions): Promise<Record<string, unknown>> => (api.call({ path: `/clients/${client_id}/oauth-tokens/${token_id}/integration-metadata`, method: "put", body }, options))                    
                    }                
                }))            
            },
            audits: {
                get: (options?: APICallOptions): Promise<AuditStandaloneModel[]> => (api.call({ path: `/clients/${client_id}/audits`, method: "get" }, options))            
            }        
        })),
        post: (body: ClientParams, options?: APICallOptions): Promise<ClientModel> => (api.call({ path: `/clients`, method: "post", body }, options))    
    },
    businesses: {
        id: (business_id: string) => (({
            embeddedReports: {
                post: (body: EmbeddedReportParams, options?: APICallOptions): Promise<EmbeddedReportModel> => (api.call({ path: `/businesses/${business_id}/embedded-reports`, method: "post", body }, options)),
                id: (report_id: string) => (({
                    put: (body: EmbeddedReportParams, options?: APICallOptions): Promise<EmbeddedReportModel> => (api.call({ path: `/businesses/${business_id}/embedded-reports/${report_id}`, method: "put", body }, options)),
                    delete: (options?: APICallOptions): Promise<void> => (api.call({ path: `/businesses/${business_id}/embedded-reports/${report_id}`, method: "delete" }, options))                
                }))            
            }        
        }))    
    },
    global: {
        users: {
            id: (user_id: string) => (({
                roleOptions: {
                    get: (options?: APICallOptions): Promise<Role[]> => (api.call({ path: `/global/users/${user_id}/role-options`, method: "get" }, options))                
                },
                put: (body: UserGrantUpdateParams, options?: APICallOptions): Promise<UserGrantModel> => (api.call({ path: `/global/users/${user_id}`, method: "put", body }, options)),
                delete: (options?: APICallOptions): Promise<void> => (api.call({ path: `/global/users/${user_id}`, method: "delete" }, options))            
            }))        
        }    
    },
    campaigns: {
        id: (campaign_id: string) => (({
            get: (options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}`, method: "get" }, options)),
            revisions: {
                num: (revision_num: string) => (({
                    activeOrchestrationRuns: {
                        get: (options?: APICallOptions): Promise<string[]> => (api.call({ path: `/campaigns/${campaign_id}/revisions/${revision_num}/active-orchestration-runs`, method: "get" }, options))                    
                    },
                    channels: {
                        id: (channel_id: string) => (({
                            orchestrationRuns: {
                                type: (run_type: string) => (({
                                    get: (options?: APICallOptions): Promise<CampaignChannelOrchestrationRunModel[]> => (api.call({ path: `/campaigns/${campaign_id}/revisions/${revision_num}/channels/${channel_id}/orchestration-runs/${run_type}`, method: "get" }, options))                                
                                }))                            
                            },
                            adPlatformReviews: {
                                latest: {
                                    get: (options?: APICallOptions): Promise<CampaignChannelReviewModel[]> => (api.call({ path: `/campaigns/${campaign_id}/revisions/${revision_num}/channels/${channel_id}/ad-platform-reviews/latest`, method: "get" }, options))                                
                                }                            
                            }                        
                        }))                    
                    }                
                }))            
            },
            archiveState: {
                put: (body: CampaignArchiveStateParams, options?: APICallOptions): Promise<void> => (api.call({ path: `/campaigns/${campaign_id}/archive-state`, method: "put", body }, options))            
            },
            brief: {
                put: (body: CampaignBriefModel, options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/brief`, method: "put", body }, options))            
            },
            fixedChannelsBudgetAllocation: {
                put: (body: CampaignFixedBudgetAllocationParams, options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/fixed-channels-budget-allocation`, method: "put", body }, options))            
            },
            fixedLocationsBudgetAllocation: {
                put: (body: CampaignFixedBudgetAllocationParams, options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/fixed-locations-budget-allocation`, method: "put", body }, options))            
            },
            locations: {
                id: (location_id: string) => (({
                    post: (options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/locations/${location_id}`, method: "post" }, options)),
                    delete: (options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/locations/${location_id}`, method: "delete" }, options))                
                }))            
            },
            channels: {
                key: (channel_key: string) => (({
                    post: (body: AddCampaignChannelParams, options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_key}`, method: "post", body }, options)),
                    delete: (options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_key}`, method: "delete" }, options))                
                })),
                id: (channel_id: string) => (({
                    pausedState: {
                        put: (body: CampaignChannelPausedStateParams, options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_id}/paused-state`, method: "put", body }, options))                    
                    },
                    settings: {
                        options: {
                            get: (options?: APICallOptions): Promise<Record<string, unknown>> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_id}/settings/options`, method: "get" }, options))                        
                        },
                        get: (options?: APICallOptions): Promise<Record<string, unknown>> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_id}/settings`, method: "get" }, options)),
                        put: (body: Record<string, unknown>, options?: APICallOptions): Promise<Record<string, unknown>> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_id}/settings`, method: "put", body }, options))                    
                    },
                    budgetExtensions: {
                        post: (body: BudgetExtensionParams, options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_id}/budget-extensions`, method: "post", body }, options))                    
                    },
                    ads: {
                        id: (ad_id: string) => (({
                            variants: {
                                get: (options?: APICallOptions): Promise<AdModel[]> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_id}/ads/${ad_id}/variants`, method: "get" }, options))                            
                            },
                            put: (body: AdParams, options?: APICallOptions): Promise<AdModel> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_id}/ads/${ad_id}`, method: "put", body }, options)),
                            delete: (options?: APICallOptions): Promise<void> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_id}/ads/${ad_id}`, method: "delete" }, options))                        
                        })),
                        get: (options?: APICallOptions): Promise<AdModel[]> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_id}/ads`, method: "get" }, options)),
                        post: (body: AdParams, options?: APICallOptions): Promise<AdModel> => (api.call({ path: `/campaigns/${campaign_id}/channels/${channel_id}/ads`, method: "post", body }, options))                    
                    }                
                }))            
            },
            status: {
                put: (body: CampaignStatusUpdateParams, options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/status`, method: "put", body }, options))            
            },
            reviews: {
                post: (body: CampaignReviewParams, options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/reviews`, method: "post", body }, options)),
                id: (review_id: string) => (({
                    delete: (options?: APICallOptions): Promise<CampaignModel> => (api.call({ path: `/campaigns/${campaign_id}/reviews/${review_id}`, method: "delete" }, options))                
                }))            
            },
            assets: {
                get: (options?: APICallOptions): Promise<AssetModel[]> => (api.call({ path: `/campaigns/${campaign_id}/assets`, method: "get" }, options)),
                post: (body: AssetParams, options?: APICallOptions): Promise<AssetModel> => (api.call({ path: `/campaigns/${campaign_id}/assets`, method: "post", body }, options)),
                id: (asset_id: string) => (({
                    put: (body: AssetParams, options?: APICallOptions): Promise<AssetModel> => (api.call({ path: `/campaigns/${campaign_id}/assets/${asset_id}`, method: "put", body }, options)),
                    delete: (options?: APICallOptions): Promise<void> => (api.call({ path: `/campaigns/${campaign_id}/assets/${asset_id}`, method: "delete" }, options)),
                    imageContent: {
                        put: (body: ImageEditParams, options?: APICallOptions): Promise<AssetModel> => (api.call({ path: `/campaigns/${campaign_id}/assets/${asset_id}/image-content`, method: "put", body }, options))                    
                    }                
                })),
                copy: {
                    post: (body: AssetCopyParams, options?: APICallOptions): Promise<AssetModel> => (api.call({ path: `/campaigns/${campaign_id}/assets/copy`, method: "post", body }, options))                
                },
                generatedText: {
                    post: (body: TextGenerationParams, options?: APICallOptions): Promise<AssetModel> => (api.call({ path: `/campaigns/${campaign_id}/assets/generated-text`, method: "post", body }, options))                
                },
                generatedImages: {
                    post: (body: ImageGenerationParams, options?: APICallOptions): Promise<AssetModel> => (api.call({ path: `/campaigns/${campaign_id}/assets/generated-images`, method: "post", body }, options))                
                }            
            },
            comments: {
                get: (options?: APICallOptions): Promise<CommentTreeModel[]> => (api.call({ path: `/campaigns/${campaign_id}/comments`, method: "get" }, options)),
                post: (body: CommentCreateParams, options?: APICallOptions): Promise<CommentTreeModel[]> => (api.call({ path: `/campaigns/${campaign_id}/comments`, method: "post", body }, options)),
                id: (comment_id: string) => (({
                    put: (body: CommentEditParams, options?: APICallOptions): Promise<CommentTreeModel[]> => (api.call({ path: `/campaigns/${campaign_id}/comments/${comment_id}`, method: "put", body }, options)),
                    reactions: {
                        type: (react_type: string) => (({
                            post: (options?: APICallOptions): Promise<CommentTreeModel[]> => (api.call({ path: `/campaigns/${campaign_id}/comments/${comment_id}/reactions/${react_type}`, method: "post" }, options)),
                            delete: (options?: APICallOptions): Promise<CommentTreeModel[]> => (api.call({ path: `/campaigns/${campaign_id}/comments/${comment_id}/reactions/${react_type}`, method: "delete" }, options))                        
                        }))                    
                    }                
                }))            
            },
            ads: {
                id: (ad_id: string) => (({
                    get: (options?: APICallOptions): Promise<AdModel> => (api.call({ path: `/campaigns/${campaign_id}/ads/${ad_id}`, method: "get" }, options))                
                })),
                displayAd: {
                    get: (options?: APICallOptions): Promise<void> => (api.call({ path: `/campaigns/${campaign_id}/ads/display-ad`, method: "get" }, options))                
                }            
            },
            uploads: {
                id: (upload_id: string) => (({
                    get: (options?: APICallOptions): Promise<UploadModel> => (api.call({ path: `/campaigns/${campaign_id}/uploads/${upload_id}`, method: "get" }, options))                
                })),
                post: (body: File, options?: APICallOptions): Promise<UploadModel> => (api.call({ path: `/campaigns/${campaign_id}/uploads`, method: "post", body }, options))            
            },
            audits: {
                get: (options?: APICallOptions): Promise<AuditModel[]> => (api.call({ path: `/campaigns/${campaign_id}/audits`, method: "get" }, options))            
            },
            analytics: {
                get: (options?: APICallOptions): Promise<AnalyticsModel> => (api.call({ path: `/campaigns/${campaign_id}/analytics`, method: "get" }, options))            
            },
            analyses: {
                latest: {
                    get: (options?: APICallOptions): Promise<CampaignAnalysisModel> => (api.call({ path: `/campaigns/${campaign_id}/analyses/latest`, method: "get" }, options))                
                }            
            }        
        }))    
    },
    aiChat: {
        id: (chat_id: string) => (({
            delete: (options?: APICallOptions): Promise<void> => (api.call({ path: `/ai-chat/${chat_id}`, method: "delete" }, options))        
        }))    
    },
    locations: {
        embed: {
            get: (options?: APICallOptions): Promise<LocationsEmbedResp> => (api.call({ path: `/locations/embed`, method: "get" }, options))        
        },
        id: (loc_id: string) => (({
            feature: {
                get: (options?: APICallOptions): Promise<Record<string, unknown>> => (api.call({ path: `/locations/${loc_id}/feature`, method: "get" }, options))            
            },
            get: (options?: APICallOptions): Promise<LocationTaxonomyModel> => (api.call({ path: `/locations/${loc_id}`, method: "get" }, options))        
        })),
        lookup: {
            type: (loc_type: string) => (({
                get: (options?: APICallOptions): Promise<LocationWithFeatureModel[]> => (api.call({ path: `/locations/lookup/${loc_type}`, method: "get" }, options))            
            }))        
        }    
    },
    adPlatforms: {
        get: (options?: APICallOptions): Promise<AdPlatformModel[]> => (api.call({ path: `/ad-platforms`, method: "get" }, options)),
        key: (platform_key: string) => (({
            consentFlow: {
                startUrl: {
                    get: (options?: APICallOptions): Promise<OAuthConsentURLResp> => (api.call({ path: `/ad-platforms/${platform_key}/consent-flow/start-url`, method: "get" }, options))                
                },
                finalize: {
                    get: (options?: APICallOptions): Promise<void> => (api.call({ path: `/ad-platforms/${platform_key}/consent-flow/finalize`, method: "get" }, options))                
                }            
            }        
        }))    
    },
    uploads: {
        type: (upload_type: string) => (({
            id: (upload_id: string) => (({
                get: (options?: APICallOptions): Promise<Response> => (api.call({ path: `/uploads/${upload_type}/${upload_id}`, method: "get" }, { ...options, rawResp: true }))            
            }))        
        })),
        avatars: {
            post: (body: File, options?: APICallOptions): Promise<UploadModel> => (api.call({ path: `/uploads/avatars`, method: "post", body }, options))        
        }    
    }
});
