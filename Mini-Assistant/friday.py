import ollama
import faster_whisper
import requests # To talk to your Voice Clone API

# 1. Listen for audio
def listen():
    # Use Faster-Whisper to turn mic input to text
    return transcription

# 2. Think with Ollama
def think(user_input):
    response = ollama.chat(model='jarvis', messages=[
        {'role': 'user', 'content': user_input},
    ])
    return response['message']['content']

# 3. Speak with your Cloned Voice
def speak(text):
    # Send text to your local GPT-SoVITS API
    payload = {"text": text, "voice": "my_cloned_voice"}
    audio_response = requests.post("http://localhost:9880", json=payload)
    # Play audio_response.content