'''
Generative AI provider adapters.
'''
from kedet.config import ConfigError, config

from .base import (
    AIProvider, AIChatMessage, AIChatSession, AIChatResponseStream,
    AIChatResponseChunk, AIOneShotResponse
)
from .gemini import GoogleGeminiDevAIProvider, GoogleVertexAIProvider
from .model import (
    ImageGenOptionsModel, ImageGenSizeOption, ImageGenAspectRatioOption,
    ImageGenMimeTypeOption
)

def get_ai_provider() -> AIProvider:
    '''
    Return the configured `AIProvider`.
    '''
    provider = config.ai_provider.get()

    if provider == 'gemini':
        if config.gemini_dev_api_key.is_set:
            return GoogleGeminiDevAIProvider(
                api_key=config.gemini_dev_api_key.get()
            )

        return GoogleVertexAIProvider(
            project_id=config.gemini_gcp_project_id.get(),
            location=config.gemini_gcp_location.get(),
        )

    raise ConfigError('invalid ai provider: ' + provider)
