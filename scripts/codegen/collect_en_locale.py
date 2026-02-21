import os
import re
import sys
import json
import yaml

sys.path.insert(0, '.')
from codegen_common import * # pylint: disable=wildcard-import, unused-wildcard-import, wrong-import-position, wrong-import-order

SEARCH = ['app/kedet', 'backend/kedet']
SKIP = ['dist', '__pycache__', 'locations', 'public']

PATTERN = r'[^\w]t\((["\'])([^)]+)\)'

def collect_from_file(file_path: str):
    messages = []

    with open_file(file_path, 'r') as fh:
        content = fh.read()

    matches = re.finditer(PATTERN, content, re.MULTILINE)
    for match in matches:
        message = match.group(2)
        message = re.split(r'(?<=[^\\])' + match.group(1), message)[0]
        message = message.replace('\\' + match.group(1), match.group(1))
        if '(' in message and ')' not in message:
            message += ')'

        messages.append(message)

    return messages

def collect_campaign_brief():
    messages = []
    def walk(target: dict):
        if 'label' in target:
            messages.append(target['label'])
        if 'detail' in target:
            messages.append(target['detail'])
        if 'recommend_for' in target:
            messages.extend(target['recommend_for'])

        if 'fields' in target:
            for field in target['fields'].values():
                walk(field)
        if 'groups' in target:
            for group in target['groups']:
                walk(group)
        if 'options' in target and isinstance(target['options'], dict):
            for option in target['options'].values():
                walk(option)

    with open_file('common/campaign-brief.yaml') as fh:
        data = yaml.safe_load(fh)

    walk(data['campaign'])

    return messages

def collect_language_names():
    messages = []
    with open_file('common/languages.json') as fh:
        for language in json.load(fh):
            messages.append(language['name'])

    return messages

def collect_en_locale():
    messages = []

    for search_path in SEARCH:
        for rel_root, _, files in os.walk(search_path):
            skip = False
            for part in rel_root.split(os.sep):
                if part in SKIP:
                    skip = True
                    continue
            if skip:
                continue

            for file in files:
                messages.extend(collect_from_file(os.path.join(rel_root, file)))

    messages.extend(collect_campaign_brief())
    messages.extend(collect_language_names())

    locale = {}
    for message in messages:
        locale[message] = message

    with open_file('common/locales/en_US.json', 'w', nl=True) as f:
        json.dump(locale, f, indent=4, sort_keys=True)

collect_en_locale()
print('Done.')
