"""
Schema descriptor file handling for AI context provision.
"""
import os
import json

_descriptors = {}

def load_descriptor_file(descriptors_file: str):
    """
    Load the given JSON descriptor file and return the contents.

    Maintains an internal cache.
    """
    file_path = os.path.join(os.path.dirname(__file__), descriptors_file)
    if file_path not in _descriptors:
        with open(file_path, "r", encoding="utf-8") as fh:
            _descriptors[file_path] = json.load(fh)

    return _descriptors[file_path]
