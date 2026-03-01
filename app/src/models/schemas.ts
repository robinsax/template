/** This file is auto-generated. Do not modify it. */
/* eslint-disable max-len */
import { Objective } from "@/models";

export const campaignBriefSchema = {
    fields: {
        objective: {
            label: "Objective",
            detail: "Desired outcome of the campaign.",
            options: {
                reach: {
                    label: "Reach",
                    detail: "Show your ad to as many people as possible.",
                    icon: "megaphone" as const,
                    recommend_for: ["Local businesses", "events"]                
                },
                traffic: {
                    label: "Traffic",
                    detail: "Drive people to your website or app.",
                    icon: "chart" as const,
                    recommend_for: ["E-commerce", "content sites"]                
                },
                video_views: {
                    label: "Video Views",
                    detail: "Get people to watch your video content.",
                    icon: "video" as const,
                    recommend_for: ["Video marketing", "tutorials"]                
                },
                community_interaction: {
                    label: "Community Interaction",
                    detail: "Get more likes, comments, shares, and follows.",
                    icon: "like" as const,
                    recommend_for: ["Social media growth"]                
                },
                lead_generation: {
                    label: "Lead Generation",
                    detail: "Collect leads for your business.",
                    icon: "comments" as const,
                    recommend_for: ["B2B", "services", "real estate"]                
                },
                website_conversions: {
                    label: "Website Conversions",
                    detail: "Drive valuable actions on your website.",
                    icon: "money" as const,
                    recommend_for: ["E-commerce", "online services"]                
                }            
            },
            groups: [
{
                    options: ["reach"] as Objective[],
                    label: "Build Awareness",
                    detail: "Introduce yourself to new audiences."                
                }, {
                    options: ["traffic", "video_views", "community_interaction"] as Objective[],
                    label: "Drive Consideration",
                    detail: "Get people interested."                
                }, {
                    options: ["lead_generation", "website_conversions"] as Objective[],
                    label: "Create Conversions",
                    detail: "Encourage people to take valuable actions."                
                }
],
            type: "select" as const        
        },
        start_date: {
            label: "Start Date",
            detail: "Date when the campaign will start.",
            type: "date" as const        
        },
        end_date: {
            label: "End Date",
            detail: "Date when the campaign will end.",
            type: "date" as const        
        },
        budget: {
            label: "Budget",
            detail: "Budget for the campaign in CAD.",
            type: "number" as const        
        },
        budget_allocation: {
            label: "Budget Allocation",
            detail: "Budget allocation strategy between channels.",
            options: {
                fixed: {
                    label: "Fixed",
                    detail: "Use a fixed budget allocation between channels."                
                },
                intelligent: {
                    label: "Intelligent",
                    detail: "Kedet will automatically manage your budget allocation."                
                }            
            },
            type: "select" as const        
        },
        target_audience: {
            label: "Target Audiences",
            detail: "Target audiences of the campaign.",
            options: {
                online_stores: {
                    label: "Online Stores",
                    detail: "Broad audiences interested in general e-commerce, convenient shopping, and product variety.",
                    icon: "store" as const                
                },
                tech_and_gadgets: {
                    label: "Tech and Gadgets",
                    detail: "Consumers drawn to the latest technology, smart devices, and digital innovation.",
                    icon: "tech" as const                
                },
                home_and_garden: {
                    label: "Home & Garden",
                    detail: "Homeowners and DIYers focused on living spaces, outdoor areas, and decor.",
                    icon: "home" as const                
                },
                pet_supplies_and_products: {
                    label: "Pet Supplies & Products",
                    detail: "Pet owners seeking quality products for animal care, comfort, and enrichment.",
                    icon: "pets" as const                
                },
                consumer_products: {
                    label: "Consumer Products",
                    detail: "General consumers interested in practical, everyday household and lifestyle goods.",
                    icon: "cart" as const                
                },
                fashion_and_apparel: {
                    label: "Fashion and Apparel",
                    detail: "Style-conscious shoppers looking for clothing, accessories, and seasonal trends.",
                    icon: "clothes" as const                
                },
                beauty_and_personal_care: {
                    label: "Beauty and Personal Care",
                    detail: "Individuals interested in grooming, skincare, cosmetics, and personal wellness routines.",
                    icon: "makeup" as const                
                },
                sports_and_fitness_products: {
                    label: "Sports & Fitness Products",
                    detail: "Active individuals motivated by physical health, workouts, and sports performance.",
                    icon: "sports" as const                
                },
                subscription_boxes: {
                    label: "Subscription Boxes",
                    detail: "Consumers attracted to curated, recurring product experiences in niche or lifestyle categories.",
                    icon: "box" as const                
                },
                specialty_foods_and_drinks: {
                    label: "Specialty Foods and Drinks",
                    detail: "Food enthusiasts interested in unique, high-quality, or artisanal culinary products.",
                    icon: "food" as const                
                },
                automotive_parts_and_accessories: {
                    label: "Automotive Parts and Accessories",
                    detail: "Car owners and enthusiasts seeking performance parts, repairs, or vehicle customization.",
                    icon: "tools" as const                
                }            
            },
            type: "multiselect" as const        
        },
        device: {
            optional: true,
            label: "Device",
            detail: "Devices to target the campaign at.",
            options: {
                mobile: {
                    label: "Mobile",
                    detail: "Target mobile devices.",
                    icon: "phone" as const                
                },
                desktop: {
                    label: "Desktop",
                    detail: "Target laptops and desktops.",
                    icon: "computer" as const                
                },
                tablet: {
                    label: "Tablet",
                    detail: "Target tablets.",
                    icon: "tablet" as const                
                },
                connected_tv: {
                    label: "Connected TV",
                    detail: "Target smart TVs.",
                    icon: "tv" as const                
                }            
            },
            type: "multiselect" as const        
        },
        language: {
            optional: true,
            label: "Language",
            detail: "Language of the campaign.",
            type: "text" as const        
        },
        brand_safety: {
            optional: true,
            label: "Brand Safety",
            detail: "Topics to avoid to protect brand reputation.",
            options: {
                derogatory: {
                    label: "Derogatory",
                    detail: "Avoid placements around content that may be derogatory."                
                },
                downloads_sharing: {
                    label: "Downloads Sharing",
                    detail: "Avoid placements related to download sharing services."                
                },
                gambling: {
                    label: "Gambling",
                    detail: "Avoid placements around gambling content."                
                },
                violence: {
                    label: "Weapons and Violence",
                    detail: "Avoid placements around violence-related content."                
                },
                suggestive: {
                    label: "Suggestive",
                    detail: "Avoid placements near sexually suggestive content."                
                },
                profanity: {
                    label: "Profanity",
                    detail: "Avoid placements around profanity."                
                },
                drugs_alcohol: {
                    label: "Drugs and Alcohol",
                    detail: "Avoid placements around content related to drugs including tobacco and alcohol."                
                },
                political: {
                    label: "Political",
                    detail: "Avoid placements around political content."                
                },
                young_audiences: {
                    label: "Young Audiences",
                    detail: "Avoid placements targeting young audiences."                
                },
                mature_audiences: {
                    label: "Mature Audiences",
                    detail: "Avoid placements around content targeting mature audiences."                
                }            
            },
            type: "multiselect" as const        
        },
        gender: {
            optional: true,
            label: "Genders",
            detail: "Genders to target.",
            options: {
                male: {
                    label: "Male",
                    detail: "Target people identifying as male.",
                    icon: "male" as const                
                },
                female: {
                    label: "Female",
                    detail: "Target people identifying as female.",
                    icon: "female" as const                
                },
                unknown: {
                    label: "Other",
                    detail: "Target people with other gender identities.",
                    icon: "gender" as const                
                }            
            },
            type: "multiselect" as const        
        },
        age_range: {
            optional: true,
            label: "Age Ranges",
            detail: "Age ranges the campaign will target.",
            options: {
                age_18_24: {
                    label: "Age 18-24",
                    detail: "Age ranges of the campaign."                
                },
                age_25_34: {
                    label: "Age 25-34",
                    detail: "Age ranges of the campaign."                
                },
                age_35_44: {
                    label: "Age 35-44",
                    detail: "Age ranges of the campaign."                
                },
                age_45_54: {
                    label: "Age 45-54",
                    detail: "Age ranges of the campaign."                
                },
                age_55_64: {
                    label: "Age 55-64",
                    detail: "Age ranges of the campaign."                
                },
                age_65_plus: {
                    label: "Age 65+",
                    detail: "Age ranges of the campaign."                
                }            
            },
            type: "multiselect" as const        
        },
        relationship_interest: {
            optional: true,
            label: "Relationship Interest",
            detail: "Relationship interest of the campaign.",
            options: {
                men: {
                    label: "Men",
                    detail: "Target people interested in men.",
                    icon: "male" as const                
                },
                women: {
                    label: "Women",
                    detail: "Target people interested in women.",
                    icon: "female" as const                
                },
                unknown: {
                    label: "Unknown",
                    detail: "Target people with unknown gender interests.",
                    icon: "question" as const                
                }            
            },
            type: "multiselect" as const        
        },
        relationship_status: {
            optional: true,
            label: "Relationship Status",
            detail: "Relationship status of the campaign.",
            options: {
                single: {
                    label: "Single",
                    detail: "Relationship statuses of the campaign.",
                    icon: "person" as const                
                },
                in_relationship: {
                    label: "In a Relationship",
                    detail: "Relationship statuses of the campaign.",
                    icon: "heart" as const                
                },
                married: {
                    label: "Married",
                    detail: "Relationship statuses of the campaign.",
                    icon: "diamond" as const                
                },
                unknown: {
                    label: "Unknown",
                    detail: "Relationship statuses of the campaign.",
                    icon: "question" as const                
                }            
            },
            type: "multiselect" as const        
        },
        location_presence: {
            label: "Location Presence",
            detail: "Who to target relative to these locations.",
            options: {
                currently_in: {
                    label: "Currently in",
                    detail: "Target people in these locations.",
                    icon: "target" as const                
                },
                recently_in: {
                    label: "Recently in",
                    detail: "Target people who have been here recently.",
                    icon: "depart" as const                
                },
                interested_in: {
                    label: "Interested in",
                    detail: "Target people who are interested in these locations.",
                    icon: "search" as const                
                }            
            },
            type: "select" as const        
        }    
    },
    type: "object" as const
};