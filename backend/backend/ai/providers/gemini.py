'''
Google GenAI provider.
'''
import base64
from typing import AsyncGenerator, Optional
from logging import getLogger

from google import genai
from google.genai import types as gat
from google.genai.chats import AsyncChat
from google.genai.types import Content, Part

from kedet.config import config
from kedet.storage import get_storage_backend
from kedet.model import Upload, AIChat

from ..chat import AIChatContext
from .base import (
    AIChatSession, AIProvider, AIChatMessage, AIOneShotResponse, AIImageResponse
)
from .model import ImageGenOptionsModel

logger = getLogger(__name__)

gemini_model = config.gemini_model.get()
gemini_image_model = config.gemini_image_model.get()
imagen_model = config.imagen_model.get()

class _GoogleAIProvider(AIProvider):
    '''
    Base Google GenAI provider.
    '''
    client: genai.Client

    def __init__(self, client: genai.Client):
        self.client = client

    def chat_session(self, chat: AIChat, context: AIChatContext) -> AIChatSession:
        '''
        Return a stateful chat session for the provided `chat`.
        '''
        return GoogleAIChatSession(self, chat, context)

    def do_one_shot_response(self, prompt: str) -> AIOneShotResponse:
        '''
        Return a one-shot response for the provided `prompt`.
        '''
        response = self.client.models.generate_content(
            model=gemini_model,
            contents=[prompt]
        )

        return AIOneShotResponse(text=response.text)

    def do_one_shot_image_response(
        self, prompt: str,
        image: Optional[Upload] = None,
        params: Optional[ImageGenOptionsModel] = None
    ) -> AIImageResponse:
        '''
        Smart image generation that uses:
        - Imagen for text-only prompts (better quality)
        - Gemini for prompts with input images (image editing)
        '''
        if image:
            return self._generate_with_gemini(prompt, image)

        return self._generate_with_imagen(prompt, params)

    def _generate_with_imagen(
        self, prompt: str, params: Optional[ImageGenOptionsModel] = None
    ) -> AIImageResponse:
        '''
        Generate image using Imagen model (text-only)
        '''
        if params is None:
            params = ImageGenOptionsModel()

        mime_type = f'image/{params.output_mime_type.value.lower()}'

        response = self.client.models.generate_images(
            model=imagen_model,
            prompt=prompt,
            config={
                'number_of_images': 1,
                'image_size': params.image_size.value,
                'aspect_ratio': params.aspect_ratio.value,
                'output_mime_type': mime_type
            }
        )

        if not response.generated_images:
            raise ValueError('No images generated')

        generated_image = response.generated_images[0]
        image_bytes = base64.b64decode(generated_image.image.image_bytes)

        return AIImageResponse(
            image_bytes=image_bytes,
            mime_type=mime_type
        )

    def _generate_with_gemini(
        self, prompt: str, image: Optional[Upload] = None
    ) -> AIImageResponse:
        '''
        Generate image using Gemini model (text + image)
        '''
        parts = [Part.from_text(text=prompt)]

        if image:
            mime_type = image.content_type
            with get_storage_backend().read(image) as data:
                image_bytes = data.read()

            parts.append(Part(inline_data=gat.Blob(
                data=image_bytes,
                mime_type=mime_type
            )))

        content = Content(role='user', parts=parts)

        response = self.client.models.generate_content(
            model=gemini_image_model,
            contents=[content],
            config=gat.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE']
            )
        )

        try:
            output_image_bytes = None
            mime_type = None

            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    output_image_bytes = base64.b64decode(part.inline_data.data)
                    mime_type = part.inline_data.mime_type
                    break

            if not output_image_bytes:
                raise ValueError('No image data found in API response')

        except (AttributeError, IndexError) as e:
            raise ValueError('Could not parse image from the API response.') from e

        return AIImageResponse(
            image_bytes=output_image_bytes,
            mime_type=mime_type or 'image/png'
        )

class GoogleGeminiDevAIProvider(_GoogleAIProvider):
    '''
    `AIProvider` adapter for Google GenAI that authenticates against the Gemini Dev API.
    '''
    def __init__(self, *, api_key: str):
        super().__init__(client=genai.Client(api_key=api_key))

class GoogleVertexAIProvider(_GoogleAIProvider):
    '''
    `AIProvider` adapter for Google GenAI that authenticates against the VertexAI API.
    '''
    def __init__(self, *, project_id: str, location: str):
        super().__init__(client=genai.Client(
            vertexai=True,
            project=project_id,
            location=location
        ))

class GoogleAIChatSession(AIChatSession):
    '''
    Stateful Google GenAI chat session. See `AIChatSession`.
    '''
    provider: _GoogleAIProvider
    session: Optional[AsyncChat]

    def __init__(self, provider: _GoogleAIProvider, chat: AIChat, context: AIChatContext):
        super().__init__(chat, context)
        self.provider = provider
        self.session = None

    async def do_stream(self, message: AIChatMessage) -> AsyncGenerator[str, None]:
        '''
        Return an `AIChatResponseStream` for the LLM response to the provided `message`.
        '''
        if not self.session:
            # Lazy-init session.
            history = []
            for prev in self.chat.messages:
                history.append({
                    'role': prev.role.value,
                    'parts': [{ 'text': self.render_message(prev) }]
                })

            system_prompt = self.context.system_prompt(self.chat)

            tools = self.context.tools()

            logger.debug(
                'Init chat with %d history:\n%s', len(history), system_prompt
            )

            self.session = self.provider.client.aio.chats.create(
                model=gemini_model,
                history=history,
                config=gat.GenerateContentConfig(
                    system_instruction=system_prompt,
                    tools=tools
                )
            )

        rendered = self.render_message(message)
        logger.debug('TX: %s', rendered)

        # Stream response chunks.
        stream = await self.session.send_message_stream(rendered)

        # Track whether we've seen tool calls to prevent duplicate responses.
        # Gemini outputs duplicate text after executing tools.
        tool_call_seen = False

        async for chunk in stream:
            if chunk.text:
                if tool_call_seen:
                    continue

                had_suggestions_before = bool(self.context.suggestions)
                yield chunk.text

                if not had_suggestions_before and self.context.suggestions:
                    tool_call_seen = True
