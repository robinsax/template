"""
Internationalization.
"""
import os
import json
from logging import getLogger
from typing import Callable
from dataclasses import dataclass

from backend.config import config

logger = getLogger(__name__)

I18nFn = Callable[[str], str]

class I18nError(Exception):
    """
    Thrown when an i18n error occurs.
    """

def get_supported_locales() -> list[str]:
    """
    Return the list of supported locales.
    """
    locale_paths = config.locales_path.get()

    locales = []
    for filename in os.listdir(locale_paths):
        if filename.endswith(".json"):
            locales.append(filename.replace(".json", ""))

    return locales

def get_current_t() -> I18nFn:
    """
    Return the translation function for `get_current_locale`.
    """
    from backend.service import get_current_locale # pylint: disable=import-outside-toplevel

    return t_for_locale(get_current_locale())

def t_for_locale(locale: str) -> I18nFn:
    """
    Return a function `t` to convert messages to the given locale.
    """
    locale_path = os.path.join(config.locales_path.get(), locale + ".json")
    if not os.path.exists(locale_path):
        raise I18nError("missing locale: " + locale)

    with open(locale_path, "r", encoding="utf-8") as fh:
        translations = json.load(fh)

    def resolve(message: str):
        if message not in translations:
            logger.warning("missing translation: %s", message)

        return translations.get(message, message)

    return resolve

@dataclass
class LanguageEntry:
    """
    A language entry.
    """
    name: str
    locale: str

def load_languages() -> list[LanguageEntry]:
    """
    Loads and returns the languages JSON file.
    """
    with open(config.languages_path.get(), "r", encoding="utf-8") as fh:
        data = json.load(fh)

    return [LanguageEntry(**lang) for lang in data]
