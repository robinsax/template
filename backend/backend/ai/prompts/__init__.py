"""
Prompt template rendering.
"""
import os
import re
from jinja2 import Environment, FileSystemLoader

def render_prompt(prompt_template: str, context: dict) -> str:
    """
    Render the given `prompt_template` with the given `context`.
    """
    loader_path = os.path.join(os.path.dirname(__file__), "templates")
    env = Environment(loader=FileSystemLoader(loader_path))

    template = env.get_template(prompt_template)

    rendered = template.render(context)
    rendered = re.sub(r"\n\n+", "\n\n", rendered.strip())

    return rendered
