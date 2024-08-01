import os
import argparse
from openai import OpenAI
from openai.types import Completion

api_key = os.getenv("OPENAI_API_KEY")

def detect_sarcasm(client=None, text=None):
    try:
        resp: Completion = client.completions.create(
            model="gpt-3.5-turbo-instruct",
            prompt=f"Analyze the following paragraph and determine if it contains sarcasm:\n\n\"{text}\"\n\nAnswer with 'Sarcastic' or 'Not Sarcastic'.",
            max_tokens=100,
            n=1,
            stop=None,
            temperature=0.5
        )
        answer = resp.choices[0].text.strip()
        return answer
    except Exception as e:
        return f"An error occurred: {str(e)}"

def main(text):
    client = OpenAI(api_key=api_key)
    result = detect_sarcasm(text=text, client=client)
    print(result)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Detect sarcasm in a paragraph of text using OpenAI.')
    parser.add_argument('text', type=str, help='The text to analyze for sarcasm.')
    args = parser.parse_args()
    
    main(args.text)