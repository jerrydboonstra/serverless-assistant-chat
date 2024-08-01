import os
import logging
import pytest
from openai import OpenAI

'''
Share fixtures across test files.
'''

api_key = os.environ['OPENAI_API_KEY']

@pytest.fixture(autouse=True)
def set_up_logging():
    logging.basicConfig(level=logging.INFO)
    yield

@pytest.fixture(scope="module")
def openai_client(api_key=api_key) -> str:
    return OpenAI(api_key=api_key)
