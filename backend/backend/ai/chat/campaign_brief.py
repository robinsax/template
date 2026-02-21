'''
Campaign brief AI chat context implementation.
'''
import json
import uuid
from typing import Callable
from datetime import date

from kedet.service import get_session_as_context
from kedet.model import (
    Campaign, CampaignBriefModel, AIChat, AIChatStateModel, Location, User,
    AIChatSuggestionModel
)
from kedet.channels import (
    get_available_ad_platforms_for_business, get_ad_channel_model
)
from kedet.logic import t_for_locale

from ..prompts import render_prompt
from ..tools import tool, make_describe_object, make_suggest_value
from .base import AIChatContext

# TODO: Defining this in multiple places...
MAIN_BRIEF_STATES = {
    'objective': ['objective'],
    'timeline': ['start_date', 'end_date'],
    'budget': ['budget', 'channels'],
    'targeting': [
        'target_audience',
        'device',
        'language',
        'brand_safety',
        'gender',
        'age_range',
        'relationship_interest',
        'relationship_status'
    ],
    'media_strategy': ['channels'],
    'locations': ['location_presence', 'locations']
}

class CampaignBriefAIChatContext(AIChatContext):
    '''
    Campaign brief AI chat context. See `AIChatContext`.
    '''
    __topic__ = 'campaign_brief'
    __object__ = Campaign

    describe_object: Callable[[str], str]

    def __init__(self, user: User, campaign: Campaign):
        super().__init__(user, campaign)
        self.describe_object = make_describe_object('campaign-brief.json')

    @property
    def campaign(self) -> Campaign:
        '''
        Return the campaign object.
        '''
        return self.object

    def system_prompt(self, chat: AIChat) -> str:
        '''
        Return the system prompt for the campaign brief AI chat.
        '''
        return render_prompt('campaign_brief.prompt', {
            'user': chat.user,
            'today': str(date.today()),
            'describe_object': self.describe_object,
            'campaign': self.campaign,
            'locale': self.user.locale
        })

    def tools(self) -> list[Callable]:
        '''
        Return the tools for the campaign brief AI chat.
        '''
        @tool
        def get_current_field_value(field: str) -> str:
            '''
            Return the current value of the given field.
            '''
            if not hasattr(self.campaign.brief, field):
                return 'Invalid field'

            return str(getattr(self.campaign.brief, field))

        @tool
        def search_locations(query: str) -> str:
            '''
            Return a list of locations matching the given query.
            '''
            with get_session_as_context() as session:
                locations = Location.term_query(session, query, limit=10)

            return json.dumps([
                location.to_model().model_dump() for location in locations
            ])

        @tool
        def suggest_location(location_id: str) -> str:
            '''
            Suggest a location to the user.
            '''
            try:
                location_id = uuid.UUID(location_id)
            except ValueError:
                return 'Invalid location ID'

            with get_session_as_context() as session:
                location = Location.get(session, location_id)

            if not location:
                return 'Invalid location ID'

            self.suggestions.append(
                AIChatSuggestionModel(
                    key='location',
                    value=location.to_model()
                )
            )
            return 'Ok'

        @tool
        def get_channel_options() -> str:
            '''
            Return a list of channel options for the campaign.
            '''
            # We always communicate with LLMs in English regardless of current locale.
            t = t_for_locale('en_US')

            with get_session_as_context() as session:
                channels = get_available_ad_platforms_for_business(
                    session, self.campaign.business
                )

            options = {}
            for channel in channels:
                defn = channel.get_model(t)
                options.update({
                    key: value.model_dump() for key, value in defn.options.items()
                })

            return json.dumps(options)

        @tool
        def suggest_channel(channel_key: str) -> str:
            '''
            Suggest a channel to the user.
            '''
            if not get_ad_channel_model(channel_key):
                return 'Invalid channel'

            self.suggestions.append(
                AIChatSuggestionModel(
                    key='channel',
                    value=channel_key
                )
            )
            return 'Ok'

        suggest_value = make_suggest_value(self, CampaignBriefModel)

        return [
            get_current_field_value,
            suggest_value,
            suggest_location,
            search_locations,
            get_channel_options,
            suggest_channel,
            self.describe_object
        ]

    def validate_state(self, state: AIChatStateModel) -> bool:
        '''
        Validate the given brief state.
        '''
        if state.key not in MAIN_BRIEF_STATES and state.key != 'locations':
            return False

        if state.data:
            return False

        return True

    def explain_state(self, state: AIChatStateModel) -> str:
        '''
        Explain the given brief state.
        '''
        return (
            'The user is currently looking at these fields: ' +
            ', '.join(MAIN_BRIEF_STATES[state.key])
        )
