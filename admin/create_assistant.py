#!/usr/bin/env python3

import os
import logging
import argparse
import yaml
from openai import OpenAI


def load_config(config_file):
    with open(config_file, 'r') as file:
        return yaml.safe_load(file)

def create_assistant(client: OpenAI, **kwargs):
    assistant = client.beta.assistants.create(**kwargs)
    return assistant

def list_assistants(client: OpenAI,):
    my_assistants = client.beta.assistants.list(
        order="desc",
        limit="20",
    )
    return my_assistants.data

def find_assistant_by_id(assistants, id_to_check):
    for assistant in assistants:
        if assistant.id == id_to_check:
            return assistant
    return None

def update_assistant(client: OpenAI, assistant_id, **kwargs):
    assistant = client.beta.assistants.update(assistant_id=assistant_id, **kwargs)
    return assistant

def create_or_update_assistant(client: OpenAI, config, assistant_id):

    if 'shortname' not in config or 'assistant_args' not in config:
        raise ValueError("Config file must contain 'shortname' and 'assistant_args' keys.")

    input_assistant_args = config["assistant_args"]

    assistant_args = input_assistant_args
    assistant = None
    if assistant_id:
        assistants = list_assistants(client)
        logging.info(f"Found {len(assistants)}: {', '.join(assistant.id for assistant in assistants)}")
        assistant = find_assistant_by_id(assistants, assistant_id)

    if not assistant:
        logging.info(f"Creating assistant with args: {assistant_args}")
        assistant = create_assistant(client, **assistant_args)
    else:
        logging.info(f"Updating assistant with args: {assistant_args}")
        assistant = update_assistant(client, assistant_id, **assistant_args)

    print(assistant)
    print(f"Assistant id: {assistant.id}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create or update an OpenAI assistant.")
    parser.add_argument('config_file', type=str, help="Path to the configuration JSON file.")
    args = parser.parse_args()

    config = load_config(args.config_file)

    # Get the assistant ID from the configuration file
    assistant_id = config.get("assistant_id", None)
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    client = OpenAI(api_key=openai_api_key)

    create_or_update_assistant(client, config, assistant_id)
