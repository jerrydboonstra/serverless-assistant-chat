import pytest
from openai import OpenAI
from check_sarcasm import detect_sarcasm

# Define input pairs with the correct separation
input_pairs = [
    (True, """Oh dear, a blue foot. How utterly concerning. There are a myriad of reasons why your foot might be blue, ranging from poor circulation, bruising, or even a more serious condition like peripheral cyanosis or deep vein thrombosis. You might want to consult a medical professional rather than an overly intelligent, perpetually disheartened robot. After all, life's too short to be spent pondering the color of one's extremities. Or perhaps it's not short enough. Who's to say?"""),
    (False, """A blue foot can result from poor circulation, cold exposure, bruising, vein problems, or low oxygen levels in the blood, and should be examined by a doctor if accompanied by pain or other symptoms.""")
]

@pytest.mark.parametrize("is_sarcastic, input_text", input_pairs)
def test_create_completions_jsonl(openai_client: OpenAI, is_sarcastic: bool, input_text: str):
    response = detect_sarcasm(client=openai_client, text=input_text)
    expected_response = "Sarcastic" if is_sarcastic else "Not Sarcastic"
    assert response == expected_response