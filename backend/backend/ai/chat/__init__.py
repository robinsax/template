"""
AI chat context system.
"""
from typing import Optional

from .base import AIChatContext
from .campaign_brief import CampaignBriefAIChatContext
from .campaign_creatives import CampaignCreativesAIChatContext

_contexts = [
    CampaignBriefAIChatContext,
    CampaignCreativesAIChatContext
]

def get_chat_context_cls_for_topic(topic: str) -> Optional[type[AIChatContext]]:
    """
    Return the `AIChatContext` implementation for the given `topic`, or `None` if there
    isn"t one.
    """
    for context_cls in _contexts:
        if context_cls.__topic__ == topic:
            return context_cls

    return None
