"""
Base AI chat context class implementation.
"""
from typing import Callable, Optional, TypeVar
from sqlalchemy.orm import Session

from backend.model import (
    AIChat, BaseMixin, AIChatStateModel, AIChatSuggestionModel, User
)

T = TypeVar("T", bound=BaseMixin)
class AIChatContext:
    """
    Base class for AI chat contexts. Chat contexts are stateful and share the chat
    session lifespan. Chats implement a `__topic__` by name. They may declare a related
    object of some type, which the client must provide a valid and authorized reference
    to.

    Implementations may support "states" which the client can declare. These allow
    additional context to be provided to the LLM.

    Chat contexts exist across async boundaries and cannot hold `Session` objects without
    expunging them. `refresh` is called on each chat step for this reason.
    """
    __topic__: Optional[str] = None
    """
    The topic name that this AI chat context implements.
    """
    __object__: Optional[type[T]] = None
    """
    AI chats may happen related to an object of some type, for example a `Campaign`. This
    attribute declares that dependency.
    """

    user: User
    object: Optional[T]
    suggestions: list[AIChatSuggestionModel]
    """
    List of suggestions generated during each LLM output. Flushed at end of output.
    """

    def __init__(self, user: User, obj: Optional[T]):
        self.user = user
        self.object = obj
        self.suggestions = []

    def refresh(self, session: Session, chat: AIChat):
        """
        Refresh, then expunge, the related ORM object if there is one.
        """
        if not self.__object__:
            return

        self.object = self.__object__.get(session, chat.related_object_id)
        self.object.expunge()

    def flush_suggestions(self) -> list[AIChatSuggestionModel]:
        """
        Return the currently collected suggestions, then clear the set.
        """
        queued = self.suggestions
        self.suggestions = []

        return queued

    def system_prompt(self, chat: AIChat) -> str:
        """
        Return the system prompt for the given `AIChat` of this topic.

        Implementations must override.
        """
        raise NotImplementedError()

    def tools(self) -> list[Callable]:
        """
        Return the list of tools to be made available to the LLM.

        Implementations may override.
        """
        return []

    def validate_state(self, _state: AIChatStateModel) -> bool:
        """
        Return whether the given `state` is valid. Careful - this is client input
        validation.

        Implementations may override if they support stateful user chat.
        """
        return False

    def explain_state(self, state: AIChatStateModel) -> str:
        """
        Return an explaination of the given `state` for the LLM.

        Implementations may override if they support stateful user chat.
        """
        raise ValueError(state.key)
