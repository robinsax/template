"""
Generation utilities.
"""
import json
import logging
from io import BytesIO
from typing import Optional
from pydantic import ValidationError
from sqlalchemy.orm import Session

from backend.model import (
    Campaign, Upload, UploadType, AssetType, CampaignChannel,
    CampaignAnalysisFindingType, CampaignAnalysisPriority,
    CampaignAnalysisSentiment, Finding, AIFindingDataModel
)
from backend.storage import get_storage_backend
from backend.logic import (
    BoundingBoxModel, get_image_dimensions, crop_image,
    get_target_dimensions_for_aspect_ratio
)
from backend.analytics import AnalyticsModel

from .providers import get_ai_provider, ImageGenOptionsModel, ImageGenMimeTypeOption
from .tools import make_get_asset_specs, make_describe_object_values

logger = logging.getLogger(__name__)

def _find_json_array_text(text: str) -> Optional[str]:
    """
    Extract JSON array from LLM response by finding the first "[" and last "]".
    """
    start = text.find("[")
    end = text.rfind("]")

    if start == -1 or end == -1 or end <= start:
        return None

    return text[start:end + 1]

def _sanitize_finding_data(finding: dict) -> dict:
    """
    Sanitize finding data by filtering out non-numeric values from supporting_metrics.
    """
    if "data" not in finding or "supporting_metrics" not in finding["data"]:
        return finding

    metrics = finding["data"]["supporting_metrics"]
    if not isinstance(metrics, dict):
        return finding

    sanitized_metrics = {
        key: value for key, value in metrics.items()
        if isinstance(value, (int, float))
    }

    finding["data"]["supporting_metrics"] = (
        sanitized_metrics if sanitized_metrics else None
    )
    return finding

def generate_campaign_image( # pylint: disable=too-many-locals
    session: Session,
    campaign: Campaign,
    prompt: str,
    image: Optional[Upload] = None,
    params: Optional[ImageGenOptionsModel] = None
) -> Upload:
    """
    Generate an image using AI based on the given `campaign` and return its `Upload`.

    The caller must create an `Audit` event for the upload.
    """
    ai_provider = get_ai_provider()
    storage = get_storage_backend()

    context = {
        "name": campaign.name,
        "summary": campaign.ai_summary,
        "description": prompt
    }

    response = ai_provider.generate_image(
        "generate_campaign_image.prompt", 
        context,
        image=image,
        params=params
    )

    image_data = BytesIO(response.image_bytes)

    if params and params.aspect_ratio:
        # Force crop to aspect ratio to catch inaccuracies.
        image_width, image_height = get_image_dimensions(image_data)

        aspect_x, aspect_y = [int(x) for x in params.aspect_ratio.split(":")]
        target_width, target_height = get_target_dimensions_for_aspect_ratio(
            image_width, aspect_x / aspect_y
        )

        image_data = crop_image(
            image_data,
            crop_box=BoundingBoxModel(
                x=0,
                y=0,
                width=image_width,
                height=image_height
            ),
            final_size=(target_width, target_height),
            out_format=params.output_mime_type
        )

    ext = "png"
    if params and params.output_mime_type == ImageGenMimeTypeOption.JPEG:
        ext = "jpg"

    return storage.upload(
        session,
        campaign.business_authz_scope,
        UploadType.CAMPAIGN_ASSETS,
        "generated_image." + ext,
        image_data
    )

def generate_campaign_text(
    campaign: Campaign, prompt: str, text: Optional[str] = None,
    asset_type: Optional[AssetType] = None
) -> str:
    """
    Generate a text variant using AI based on the given `campaign`.
    """
    ai_provider = get_ai_provider()

    response = ai_provider.one_shot_response("generate_campaign_text.prompt", {
        "name": campaign.name,
        "summary": campaign.ai_summary,
        "original_text": text,
        "description": prompt,
        "text_specs": make_get_asset_specs(campaign, True)(asset_type)
    })

    return response.text

def generate_campaign_summary(
    campaign: Campaign, channel_names: list[str], locations_names: list[str]
) -> str:
    """
    Generate a campaign summary using AI based on the given `campaign`.
    """
    ai_provider = get_ai_provider()

    describe_brief = make_describe_object_values("campaign-brief.json")

    response = ai_provider.one_shot_response("campaign_summary.prompt", {
        # TODO: Clean up these parameters.
        "name": campaign.name,
        "campaign": campaign,
        "business_name": campaign.business.name,
        "brief_values": describe_brief(campaign.brief),
        "locations_values": ", ".join(locations_names),
        "channels_values": ", ".join(channel_names)
    })

    return response.text

def generate_channel_findings(
    finding_type: CampaignAnalysisFindingType,
    campaign: Campaign,
    channel: CampaignChannel,
    analytics: AnalyticsModel
) -> list[Finding]:
    """
    Generate campaign channel findings from AI provider for a specific finding type.
    """
    if finding_type == CampaignAnalysisFindingType.INSIGHT:
        prompt_template = "channel_insights.prompt"
    elif finding_type == CampaignAnalysisFindingType.RECOMMENDATION:
        prompt_template = "channel_recommendations.prompt"
    elif finding_type == CampaignAnalysisFindingType.PREDICTION:
        prompt_template = "channel_predictions.prompt"
    else:
        raise ValueError("invalid finding type")

    ai_provider = get_ai_provider()

    response = ai_provider.one_shot_response(prompt_template, {
        "name": campaign.name,
        "summary": campaign.ai_summary,
        "brief": campaign.brief.model_dump(mode="json"),
        "channel": channel.channel.label,
        "analytics": analytics.model_dump(mode="json")
    })

    json_text = _find_json_array_text(response.text)
    if json_text is None:
        logger.warning(
            "failed to extract JSON from %s response for channel %s"
            "\nresponse: %s\n",
            finding_type.value, channel.id, response.text
        )
        return []

    try:
        raw_findings = json.loads(json_text)
    except json.JSONDecodeError as e:
        logger.warning(
            "failed to parse %s JSON for channel %s"
            "\nerror: %s\nresponse: %s\n",
            finding_type.value, channel.id, str(e), response.text
        )
        return []

    findings = []
    for finding in raw_findings:
        try:
            sanitized = _sanitize_finding_data(finding)

            findings.append(Finding(
                channel_id=channel.id,
                priority=CampaignAnalysisPriority(sanitized["priority"]),
                type=finding_type,
                sentiment=CampaignAnalysisSentiment(sanitized["sentiment"]),
                data=AIFindingDataModel(**sanitized["data"])
            ))
        except ValidationError:
            logger.warning(
                "failed to parse %s response for channel %s\nresponse: %s\n",
                finding_type.value, channel.id, json_text
            )

    return findings
