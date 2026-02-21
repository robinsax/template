'''
Tool system and common implementations.
'''
import json
import inspect
import traceback
from enum import Enum
from types import NoneType
from datetime import datetime
from logging import getLogger
from typing import Callable, Union, Optional, Any, get_origin, get_args
from decorator import decorator

from kedet.model import (
    Model, AIChatSuggestionModel, Campaign, AssetType,
    TextSlotSpecModel, CTASlotSpecModel, URLSlotSpecModel,
    ImageSlotSpecModel, VideoSlotSpecModel
)

from .chat import AIChatContext
from .descriptors import load_descriptor_file

logger = getLogger(__name__)

@decorator
def tool(func, *args):
    '''
    Decorator for tool functions that instruments logging and error handling.
    '''
    logger.debug('tool called: %s: %s', func.__name__, args)
    try:
        rv = func(*args)
    except Exception as err:
        logger.error(
            'tool failed: %s: %s%s',
            func.__name__, str(err),
            ''.join(traceback.format_tb(err.__traceback__))
        )
        raise

    logger.debug('tool returned: %s: %s', func.__name__, rv)
    return rv

def make_describe_object(
    descriptors_filename: str, *,
    field_handlers: Optional[dict[str, Callable[[], str]]] = None
) -> Callable[[str], str]:
    '''
    Return a `describe_object()` tool that describes schema based on the descriptors in
    the given `descriptors_filename`.

    Special case per-field handlers can be provided.
    '''
    descriptors = load_descriptor_file(descriptors_filename)

    @tool
    def describe_object(name: str) -> str:
        if field_handlers and name in field_handlers:
            return field_handlers[name]()

        descriptor = descriptors.get(name)
        if not descriptor:
            return 'Invalid object to define'

        return json.dumps({ name: descriptor })

    return describe_object

def make_describe_object_values(
    descriptors_filename: str, *,
    field_handlers: Optional[dict[str, Callable[[Any], str]]] = None
) -> Callable[[str], str]:
    '''
    Return a `describe_object_values()` tool that describes the current values
    of a `Model` using the descriptors in `descriptors_filename`.

    Special case per-field handlers can be provided.
    '''
    descriptors = load_descriptor_file(descriptors_filename)

    @tool
    def describe_object_values(model: Model) -> str:
        result = {}

        for name in model.model_fields:
            value = getattr(model, name)

            result[name] = {
                'value': str(value)
            }
            if field_handlers and name in field_handlers:
                result[name]['value'] = field_handlers[name](value)

            info = descriptors.get(name)
            if not info:
                raise ValueError('invalid descriptors for ' + model.__class__.__name__)

            result[name]['field_desc'] = ' - '.join([
                info['label'],
                info['detail']
            ])
            if value and info['type'] == 'enum':
                desc = []
                if not isinstance(value, list):
                    value = [value]

                for item in value:
                    option_info = info['options'][item.value]
                    desc.append(' - '.join([
                        option_info['label'],
                        option_info['detail']
                    ]))

                result[name]['value_desc'] = ', '.join(desc)

        return json.dumps(result)

    return describe_object_values

def make_suggest_value(
    context: AIChatContext, model_cls: type[Model]
) -> Callable[[str, str], str]:
    '''
    Return a `suggest_value()` tool that pushes suggestions to the given `context` after
    validating and type-converting them against the given `model_cls`.
    '''
    @tool
    def suggest_value(field: str, value: str) -> str:
        if field not in model_cls.model_fields:
            return 'Invalid field'

        anno = model_cls.model_fields[field].annotation
        field_type = anno
        if get_origin(anno) is Union:
            args = [arg for arg in get_args(anno) if arg is not NoneType]
            if len(args) != 1:
                raise NotImplementedError(field)

            field_type = args[0]

        if field_type is datetime:
            # Datetimes are stored as strings in suggestions - add TZ info.
            try:
                datetime.fromisoformat(value)
            except ValueError:
                return 'Invalid date string, use ISO format'

            if not value.endswith('Z'):
                value += 'Z'
        elif field_type is float:
            try:
                value = float(value)
            except ValueError:
                return 'Invalid number value'
        elif inspect.isclass(field_type) and issubclass(field_type, Enum):
            try:
                value = field_type(value)
            except ValueError:
                return 'Invalid enum value'

        suggestion = AIChatSuggestionModel(
            key=field,
            value=value
        )

        context.suggestions.append(suggestion)
        return 'Success'

    return suggest_value

def make_get_asset_specs(campaign: Campaign, simplified: bool = False):
    '''
    Return a tool function for describing specs for an asset type within a campaign.
    '''
    @tool
    def get_asset_specs(asset_type: str) -> str:
        '''
        Return a description of the asset type specs for the campaign.
        Used for chat based asset context and suggestions.
        '''
        if not hasattr(campaign, 'channels') or not campaign.channels:
            return 'No channels have been selected for this campaign'

        try:
            asset_type_enum = AssetType(asset_type)
        except ValueError:
            return 'Invalid asset type'

        def format_range(range_tuple):
            if range_tuple is None:
                return None
            return {'min': range_tuple[0], 'max': range_tuple[1]}

        specs = []
        for channel in campaign.channels:
            for slot in channel.channel.ad_spec.slots:
                if slot.asset_type != asset_type_enum:
                    continue

                spec = slot.model_dump()
                spec['channel'] = channel.channel.label
                spec['asset_type'] = spec['asset_type'].value

                if 'slot_count_range' in spec:
                    spec['slot_count_range'] = format_range(spec['slot_count_range'])
                if 'pool_count_range' in spec:
                    spec['pool_count_range'] = format_range(spec['pool_count_range'])
                if 'length_range' in spec:
                    spec['length_range'] = format_range(spec['length_range'])
                if 'duration_range' in spec:
                    spec['duration_range_seconds'] = format_range(
                        spec.pop('duration_range')
                    )

                if 'options' in spec and isinstance(slot, CTASlotSpecModel):
                    spec['allowed_values'] = [
                        ' '.join(opt.value.split('_')).title() 
                        for opt in spec.pop('options')
                    ]

                if isinstance(slot, URLSlotSpecModel) and \
                    spec.get('verification_required'):
                    spec['verification_note'] = 'Domain verification required'

                if 'options' in spec and isinstance(
                    slot, (ImageSlotSpecModel, VideoSlotSpecModel)
                ):
                    global_size_range = spec.pop('size_range')
                    spec['dimension_options'] = [{
                        'aspect_ratio': opt['aspect_ratio'],
                        'aspect_ratio_tolerance': opt.get('aspect_ratio_tolerance'),
                        'width_range_px': format_range(opt['width_range']),
                        'size_range_bytes': format_range(
                            opt.get('size_range', global_size_range)
                        )
                    } for opt in spec.pop('options')]
                elif 'size_range' in spec:
                    spec['size_range_bytes'] = format_range(spec.pop('size_range'))

                specs.append(spec)

        if not specs:
            return f'No slots found for asset type: {asset_type}'

        return json.dumps(specs, indent=2)

    @tool
    def get_simplified_asset_specs(asset_type: str) -> str:
        '''
        Return a simplified description of the asset type specs for the campaign
        for the explicit purpose of generation. Supported types are text & image.
        '''
        if not hasattr(campaign, 'channels') or not campaign.channels:
            return 'No channels have been selected for this campaign'

        try:
            asset_type_enum = AssetType(asset_type)
        except ValueError:
            return 'Invalid asset type'

        specs = []
        for channel in campaign.channels:
            for slot in channel.channel.ad_spec.slots:
                if slot.asset_type != asset_type_enum:
                    continue

                simple_spec = {
                    'label': slot.label,
                    'asset_type': slot.asset_type.value
                }

                if isinstance(slot, TextSlotSpecModel):
                    simple_spec['min_length'] = slot.length_range[0]
                    simple_spec['max_length'] = slot.length_range[1]
                elif isinstance(slot, ImageSlotSpecModel):
                    if slot.options:
                        simple_spec['dimensions'] = [
                            f'{opt.aspect_ratio}:1 aspect ratio, '
                            f'{opt.width_range[0]}-{opt.width_range[1]}px wide'
                            for opt in slot.options
                        ]

                specs.append({
                    'channel': channel.channel.label,
                    **simple_spec
                })

        if not specs:
            return f'No slots found for asset type: {asset_type}'

        return json.dumps(specs, indent=2)

    if simplified:
        return get_simplified_asset_specs

    return get_asset_specs
