import os
import wave
import struct
import requests
import ollama
import numpy as np
import pyaudio
from openwakeword.model import Model
from faster_whisper import WhisperModel

# --- SETTINGS ---
WAKE_WORD = "hey_jarvis" 
OLLAMA_MODEL = "llama3"
TTS_URL = "http://localhost:9880" # Your cloned voice API

# Initialize Models
print("Loading Jarvis Systems...")
oww_model = Model(wakeword_models=[WAKE_WORD])
stt_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")

# Audio Config
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
CHUNK = 1280 # 80ms frames for OpenWakeWord
audio = pyaudio.PyAudio()

def speak(text):
    print(f"Jarvis: {text}")
    try:
        requests.post(TTS_URL, json={"text": text})
    except:
        print("!! Start your Voice Clone API to hear audio !!")

def get_command():
    """Records audio only while you are speaking."""
    print("Listening for command...")
    # This is a simplified version of silence detection
    frames = []
    silent_chunks = 0
    stream = audio.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)
    
    while True:
        data = stream.read(CHUNK)
        frames.append(data)
        
        # Simple volume threshold for silence detection
        rms = struct.unpack(f"{CHUNK}h", data)
        if max(abs(np.array(rms))) < 500: # Threshold for 'silence'
            silent_chunks += 1
        else:
            silent_chunks = 0
            
        if silent_chunks > 20: # Approx 1.5 seconds of silence = done talking
            break
            
    stream.stop_stream()
    stream.close()
    
    # Save temp wav for Whisper
    with wave.open("temp.wav", "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(audio.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b''.join(frames))
    
    segments, _ = stt_model.transcribe("temp.wav")
    return " ".join([s.text for s in segments])

# --- MAIN ENGINE ---
print("Jarvis is ONLINE. Say 'Hey Jarvis' to begin.")

mic_stream = audio.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)

while True:
    # 1. SCAN FOR WAKE WORD
    audio_data = np.frombuffer(mic_stream.read(CHUNK), dtype=np.int16)
    prediction = oww_model.predict(audio_data)
    
    if prediction[WAKE_WORD] > 0.5:
        print("\n[WAKE WORD DETECTED]")
        # Play a "blip" sound or just speak
        # speak("Yes, Sir?") 
        
        # 2. GET COMMAND
        user_query = get_command()
        print(f"User: {user_query}")
        
        if user_query.strip():
            # 3. THINK
            response = ollama.chat(model=OLLAMA_MODEL, messages=[
                {'role': 'system', 'content': 'You are Jarvis. Be brief.'},
                {'role': 'user', 'content': user_query}
            ])
            
            # 4. SPEAK
            speak(response['message']['content'])