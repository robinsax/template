"""
Base generative AI provider type definitions.
"""
from logging import getLogger
from dataclasses import dataclass
from typing import AsyncGenerator, Union, Optional

from backend.model import (
    AIChatMessage, AIChat, AIChatMessageRole, Upload
)

from ..chat import AIChatContext
from ..prompts import render_prompt
from .model import ImageGenOptionsModel

logger = getLogger(__name__)

@dataclass
class AIChatResponseChunk:
    """
    A non-concatinated chunk of a streamed AI chat response.
    """
    content: str

@dataclass
class AIOneShotResponse:
    """
    A single LLM response to a one-shot prompt.
    """
    text: str

@dataclass
class AIImageResponse:
    """
    A single LLM response to a one-shot image prompt.
    """
    image_bytes: bytes
    mime_type: str = "image/png"

AIChatResponseStream = AsyncGenerator[
    Union[AIChatResponseChunk, AIChatMessage], None
]
"""
Async generator returned by `AIChatSession`s during response generation.

Returns `AIChatResponseChunk`s until the response generation is complete,
then the final `AIChatMessage`.
"""

class AIChatSession:
    """
    Stateful generative AI chat session.
    """
    chat: AIChat
    context: AIChatContext

    def __init__(self, chat: AIChat, context: AIChatContext):
        self.chat = chat
        self.context = context

    async def stream_response(self, message: AIChatMessage) -> AIChatResponseStream:
        """
        Return an `AIChatResponseStream` for the LLM response to the provided `message`.
        """
        logger.debug("tx message: %s", message.content)

        output = []
        async for chunk in self.do_stream(message):
            logger.debug("rx chunk: %s", chunk)

            output.append(chunk)
            yield AIChatResponseChunk(content=chunk)

        suggestions = self.context.flush_suggestions()

        yield AIChatMessage(
            role=AIChatMessageRole.MODEL,
            content="".join(output),
            suggestions=suggestions
        )

    def render_message(self, message: AIChatMessage) -> str:
        """
        Render the given `message` for the LLM.
        """
        content = message.content
        if message.state:
            content = self.context.explain_state(message.state) + "\n\n" + content

        return content

    async def do_stream(self, message: AIChatMessage) -> AsyncGenerator[str, None]:
        """
        Return an async generator of non-concatinated LLM response chunks.

        Implementations must override.
        """
        raise NotImplementedError()

class AIProvider:
    """
    Base generative AI provider.
    """

    def chat_session(self, chat: AIChat, context: AIChatContext) -> AIChatSession:
        """
        Return a stateful chat session for the provided `chat`.

        Implementations must override.
        """
        raise NotImplementedError()

    def one_shot_response(
        self, prompt_template: str, context: dict
    ) -> AIOneShotResponse:
        """
        Render the given `prompt_template` with the given `context` and return a single
        LLM response.
        """
        prompt = render_prompt(prompt_template, context)

        return self.do_one_shot_response(prompt)

    def generate_image(
        self,
        prompt_template: str,
        context: dict,
        image: Optional[Upload] = None,
        params: Optional[ImageGenOptionsModel] = None
    ) -> AIImageResponse:
        """
        Generate an image for the given `prompt`.
        """
        prompt = render_prompt(prompt_template, context)

        return self.do_one_shot_image_response(prompt, image, params)

    def do_one_shot_response(self, prompt: str) -> AIOneShotResponse:
        """
        Return a one-shot response for the provided `prompt`.

        Implementations must override.
        """
        raise NotImplementedError()

    def do_one_shot_image_response(
        self,
        prompt: str,
        image: Optional[Upload] = None,
        params: Optional[ImageGenOptionsModel] = None
    ) -> AIImageResponse:
        """
        Return a one-shot image response for the provided `prompt`.

        Implementations must override.
        """
        raise NotImplementedError()
