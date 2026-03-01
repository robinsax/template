"""
Campaign creatives AI chat context implementation.
"""
import json
from typing import Callable
from datetime import date

from backend.service import get_session_as_context
from backend.model import (
    Campaign, Asset, AssetType, AIChat, AIChatSuggestionModel, Audit, BasicAuditEvent,
    User
)

from ..prompts import render_prompt
from ..tools import tool, make_get_asset_specs
from .base import AIChatContext

class CampaignCreativesAIChatContext(AIChatContext):
    """
    Campaign creatives AI chat context. See `AIChatContext`.
    """
    __topic__ = "campaign_creatives"
    __object__ = Campaign

    def __init__(self, user: User, campaign: Campaign):
        super().__init__(user, campaign)

    @property
    def campaign(self) -> Campaign:
        """
        Return the campaign object.
        """
        return self.object

    def system_prompt(self, chat: AIChat) -> str:
        """
        Return the system prompt for the campaign creatives AI chat.
        """
        return render_prompt("campaign_creatives.prompt", {
            "user": chat.user,
            "today": str(date.today()),
            "campaign": self.campaign,
            "asset_types": ", ".join([asset_type.value for asset_type in AssetType]),
            "locale": self.user.locale
        })

    def tools(self) -> list[Callable]:
        """
        Return the tools for the campaign creatives AI chat.
        """
        from ..generation import generate_campaign_image # pylint: disable=import-outside-toplevel

        @tool
        def get_campaign_assets(asset_type: str) -> str:
            """
            Return the campaign assets for the given asset type.
            """
            try:
                asset_type = AssetType(asset_type)
            except ValueError:
                return "Invalid asset type"

            with get_session_as_context() as session:
                all_assets = Asset.get_all_for_campaign(session, self.campaign.id)

                asset_models = []
                for asset in all_assets:
                    if asset.type != asset_type:
                        continue

                    asset_models.append(asset.to_model().model_dump())

            return json.dumps(asset_models)

        @tool
        def suggest_asset(asset_type: str, text: str) -> str:
            """
            Suggest an asset to the user.
            """
            try:
                asset_type = AssetType(asset_type)
            except ValueError:
                return "Invalid asset type"

            if asset_type not in (AssetType.HEADLINE, AssetType.DESCRIPTION):
                return "Must be a headline or description"

            self.suggestions.append(AIChatSuggestionModel(
                key="asset",
                value={
                    "type": asset_type.value,
                    "text": text
                }
            ))
            return "Ok"

        @tool
        def generate_and_suggest_image(prompt: str) -> str:
            """
            Generate and suggest an image to the user.
            """
            with get_session_as_context() as session:
                upload = generate_campaign_image(session, self.campaign, prompt)
                Audit.create(session, self.user, upload, BasicAuditEvent.CREATE)

                upload_id = str(upload.id)
                session.commit() # pylint: disable=no-member

            self.suggestions.append(AIChatSuggestionModel(
                key="asset",
                value={
                    "type": AssetType.IMAGE.value,
                    "id": upload_id,
                    "prompt": prompt
                }
            ))

            return "Ok"

        get_asset_specs = make_get_asset_specs(self.campaign)

        return [
            get_campaign_assets,
            get_asset_specs,
            generate_and_suggest_image,
            suggest_asset
        ]
