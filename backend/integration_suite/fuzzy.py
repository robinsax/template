'''
Randomization utilities.
'''
import secrets
from random import Random
from enum import Enum
from typing import Optional, TypeVar

from kedet.model import (
    CampaignModel, BriefValuesConstraintModel, BriefValuesConstraintType
)
from kedet.logic import camel_to_snake_case

ADJECTIVES = [
    'Big', 'Small', 'Tall', 'Short', 'Heavy', 'Light', 'Fast', 'Slow', 'Hungry',
    'Thirsty', 'Funny', 'Industrious', 'Lazy', 'Clever', 'Agentic', 'Stupid', 'Genius',
    'Red', 'Blue', 'Black', 'Green', 'Virtuous', 'Evil', 'Good', 'Bad', 'Smart', 'Dumb'
]

NOUNS = [
    'Cat', 'Dog', 'Mouse', 'Rabbit', 'Turtle', 'Lion', 'Tiger', 'Bear', 'Wolf', 'Fox',
    'Eli', 'House', 'Store', 'Truck', 'Car', 'Road', 'Box', 'Cheese'
]

WORDS = [*ADJECTIVES, *NOUNS]

NAME_PARTS = [ADJECTIVES, ADJECTIVES, NOUNS]

_random = Random()
_name_counts: dict[str, int] = {}

def seed_fuzzy(seed: int):
    '''
    Set the global seed.
    '''
    global _random # pylint: disable=global-statement

    _random = Random(seed)

T = TypeVar('T')
def make_choice(choices: list[T]) -> T:
    '''
    Return a random choice from a list of options.
    '''
    return _random.choice(choices)

def make_choices(choices: list[T], count: int) -> list[T]:
    '''
    Return a random selection of choices from a list of options.
    '''
    return _random.sample(choices, count)

def make_valid_password():
    '''
    Return a random password that meets the password requirements.
    '''
    return 'aA!0' + ''.join(secrets.token_hex(16))

def make_num(max_value: int = 10000):
    '''
    Return a random integer.
    '''
    return _random.randint(1, max_value)

def make_word():
    '''
    Return a random word.
    '''
    return make_choice(WORDS)

def make_next_int():
    '''
    Return a number that increments each time this is called.
    '''
    if '' not in _name_counts:
        _name_counts[''] = 0

    _name_counts[''] += 1
    return _name_counts['']

def make_name(word_count: int, suffix: Optional[str] = None):
    '''
    Return a random name that is unlikely to conflict.
    '''
    num_i = _name_counts.get(suffix, 0)
    _name_counts[suffix] = num_i + 1

    parts = []
    for i in range(word_count):
        if i == word_count - 1:
            parts.append(_random.choice(NAME_PARTS[-1]))
        else:
            parts.append(_random.choice(NAME_PARTS[i]))

    if suffix:
        parts.append(suffix)

    parts.append(str(num_i))

    return ' '.join(parts)

def make_supported_brief_field_values(campaign: CampaignModel, enum_cls: type[Enum]):
    '''
    Return a random selection of supported values for a campaign brief field.
    '''
    key = camel_to_snake_case(enum_cls.__name__[0].lower() + enum_cls.__name__[1:])

    constraints: list[BriefValuesConstraintModel] = []
    for channel in campaign.channels:
        constraint_obj = getattr(channel.channel.brief_constraints, key, None)
        if constraint_obj:
            constraints.append(constraint_obj)

    supported = []
    for value in enum_cls:
        for constraint in constraints:
            if constraint.type == BriefValuesConstraintType.FIELD_UNSUPPORTED:
                break

            if constraint.type == BriefValuesConstraintType.ALLOWLIST:
                if value not in constraint.values:
                    break

            if constraint.type == BriefValuesConstraintType.BLOCKLIST:
                if value in constraint.values:
                    break
        else:
            supported.append(value)

    count = len(supported)
    if count == 0:
        return []

    return make_choices(supported, make_num(count))
