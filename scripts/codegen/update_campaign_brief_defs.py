import sys
import json
import yaml

sys.path.insert(0, '.')
from codegen_common import * # pylint: disable=wildcard-import, unused-wildcard-import, wrong-import-position, wrong-import-order

PY_HEADER = '''
# This file is auto-generated. Do not modify it.
from enum import Enum
from datetime import datetime
from typing import Optional

from ..base import Model, EnumMixin
'''.strip()

TS_HEADER = '''
/** This file is auto-generated. Do not modify it. */
/* eslint-disable max-len */
'''.strip()

def py_def_name(key: str, is_object: bool) -> str:
    py_name = ''.join([part.title() for part in key.split('_')])
    if is_object:
        py_name += 'BriefModel'

    return py_name

def py_write_enum(key: str, content: dict) -> str:
    name = py_def_name(key, False)

    py = 'class ' + name + '(EnumMixin, Enum):\n'
    for option in content['options']:
        py += '    ' + option.upper() + ' = \'' + option + '\'\n'

    return py

def py_write_model(key: str, content: dict) -> str:
    name = py_def_name(key, True)

    py = 'class ' + name + '(Model):'
    for field_name, field in content['fields'].items():
        inner_type = field['type']
        is_list = False
        if isinstance(inner_type, list):
            inner_type = inner_type[0]
            is_list = True

        py_type = inner_type
        if inner_type == 'enum':
            py_type = py_def_name(field_name, False)
        elif inner_type == 'object':
            py_type = py_def_name(field_name, True)
        elif inner_type == 'string':
            py_type = 'str'
        elif inner_type == 'campaign_location':
            py_type = 'CampaignLocationBriefModel'

        if is_list:
            py_type = 'list[' + py_type + ']'

        py += '\n    ' + field_name + ': Optional[' + py_type + '] = None'
    py += '\n'

    return py

def update_py(content: dict):
    py_enums = []
    py_models = []

    def walk(key: str, target: dict):
        target_type = target['type']

        is_enum = (
            target_type == 'enum' or
            (isinstance(target_type, list) and target_type[0] == 'enum')
        )
        if is_enum:
            py_enums.append(py_write_enum(key, target))

        if target_type == 'object':
            for child_key, field in target['fields'].items():
                walk(child_key, field)

            py_models.append(py_write_model(key, target))

    walk('campaign', content['campaign'])

    py_optional = 'OPTIONAL_BRIEF_FIELDS = ['
    for key, field in content['campaign']['fields'].items():
        if 'optional' in field:
            py_optional += '\n    \'' + key + '\','
    py_optional += '\n]\n'

    with open_file('backend/kedet/model/campaign/brief.py', 'w') as fh:
        fh.write(PY_HEADER + '\n\n')
        fh.write('\n'.join([py_optional, *py_enums, *py_models]))

def parse_type(target_type: str) -> tuple[str, bool]:
    if isinstance(target_type, list):
        return target_type[0], True
    return target_type, False

def update_ts(content: dict): # pylint: disable=too-many-statements
    ts_imports = TSImport('@/models', [])

    def add_presentation(target: dict, ts_def: TSObject):
        if 'optional' in target:
            ts_def.add('optional', 'true')
        if 'label' in target:
            ts_def.add('label', TSString(target['label']))
        if 'detail' in target:
            ts_def.add('detail', TSString(target['detail']))
        if 'icon' in target:
            ts_def.add('icon', TSCode(str(TSString(target['icon'])) + ' as const'))
        if 'recommend_for' in target:
            ts_def.add(
                'recommend_for',
                TSValueSet([TSString(r) for r in target['recommend_for']], 'array')
            )

    def walk(key: str, target: dict, level: int): # pylint: disable=too-many-locals
        target_type = target['type']

        ts_def = TSObject(level)
        add_presentation(target, ts_def)

        inner_type, is_list = parse_type(target_type)

        ts_type = None

        if inner_type == 'enum':
            if is_list:
                ts_type = 'multiselect'
            elif 'group' in target:
                ts_type = 'groupselect'
            else:
                ts_type = 'select'

            ts_enum = TSObject(level + 1)
            for option, option_value in target['options'].items():
                ts_option = TSObject(level + 2)

                add_presentation(option_value, ts_option)

                ts_enum.add(option, ts_option)

            ts_def.add('options', ts_enum)

            if 'groups' in target:
                ts_options_type = ts_obj_key(key, True)
                ts_imports.add(ts_options_type)

                ts_groups = []
                for group in target['groups']:
                    ts_group = TSObject(level + 2)

                    options = []
                    for option in group['options']:
                        options.append(TSString(option))

                    ts_options = (
                        str(TSCode(TSValueSet(options, 'array'))) +
                        ' as ' + ts_options_type + '[]'
                    )
                    ts_group.add('options', TSCode(ts_options))

                    add_presentation(group, ts_group)

                    ts_groups.append(ts_group)

                # do not fucking add quoted squares
                groups = ''.join([
                    str(TSValueSet(ts_groups, 'array', True)),
                ])
                ts_def.add('groups', TSCode(groups))
        elif inner_type == 'object':
            ts_obj = TSObject(level + 1)
            for child_key, field in target['fields'].items():
                ts_obj.add(child_key, walk(child_key, field, level + 2))

            ts_def.add('fields', ts_obj)
            ts_type = 'object'
        else:
            ts_type = 'text'
            if inner_type == 'datetime':
                ts_type = 'date'
            elif inner_type == 'float':
                ts_type = 'number'

        ts_def.add('type', TSCode(str(TSString(ts_type)) + ' as const'))

        return ts_def

    ts_campaign = TSConstDef(
        'campaignBriefSchema',
        walk('campaign', content['campaign'], 0)
    )

    with open_file('app/kedet/models/schemas.ts', 'w') as fh:
        fh.write(TS_HEADER + '\n')
        fh.write(str(ts_imports))
        fh.write('\n\n')
        fh.write(str(ts_campaign))

def update_ai_json(content: dict):
    object_defs = {}

    def presentation(target: dict):
        desc = {}
        if 'label' in target:
            desc['label'] = target['label']
        if 'detail' in target:
            desc['detail'] = target['detail']
        if 'recommend_for' in target:
            desc['recommend_for'] = target['recommend_for']
        if 'ai_explainer' in target:
            desc['explanation'] = target['ai_explainer']

        return desc

    def walk(key: str, target: dict):
        target_type = target['type']

        inner_type, is_list = parse_type(target_type)

        desc = presentation(target)

        if inner_type == 'enum':
            options = {}
            for option, option_value in target['options'].items():
                options[option] = {
                    'label': option_value['label'],
                }
                if 'detail' in option_value:
                    options[option]['detail'] = option_value['detail']

            desc['type'] = 'enum'
            desc['multiple'] = is_list
            desc['options'] = options
        elif inner_type == 'object':
            fields = {}
            for child_key, child in target['fields'].items():
                walk(child_key, child)

                child_name = child_key
                if parse_type(child['type'])[0] == 'object':
                    child_name += '_brief'

                field_desc = { **object_defs[child_name] }
                if 'options' in field_desc:
                    del field_desc['options']
                fields[child_key] = field_desc

            desc['type'] = 'object'
            desc['fields'] = fields
            key += '_brief'
        else:
            desc['type'] = inner_type

        object_defs[key] = desc

    walk('campaign', content['campaign'])

    dest_file = 'backend/kedet/ai/descriptors/campaign-brief.json'
    with open_file(dest_file, 'w') as fh:
        json.dump(object_defs, fh, indent=4)

def update():
    with open_file('common/campaign-brief.yaml') as fh:
        content = yaml.safe_load(fh)

    update_py(content)
    update_ts(content)
    update_ai_json(content)

update()
print('Done.')
