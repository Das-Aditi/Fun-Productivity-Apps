import pyautogui
import ollama
from PIL import Image
import os

# --- VISION FUNCTION ---
def capture_and_analyze(user_query):
    print("[Jarvis is looking at your screen...]")
    
    # 1. Take Screenshot
    screenshot = pyautogui.screenshot()
    screenshot_path = "screen_capture.png"
    screenshot.save(screenshot_path)
    
    # 2. Send to LLaVA (Vision Model)
    # We combine your question with the visual data
    response = ollama.chat(
        model='llava',
        messages=[{
            'role': 'user',
            'content': f"Context: The user is asking: {user_query}. Looking at this screenshot of their desktop, give a helpful answer.",
            'images': [screenshot_path]
        }]
    )
    
    # Clean up file
    if os.path.exists(screenshot_path):
        os.remove(screenshot_path)
        
    return response['message']['content']

# --- INTEGRATION INTO MAIN LOOP ---
# Replace the 'think' section of your previous script with this logic:

def smart_think(user_query):
    vision_keywords = ["see", "screen", "looking at", "desktop", "this"]
    
    # If the user asks about the screen, use the Vision Model
    if any(word in user_query.lower() for word in vision_keywords):
        return capture_and_analyze(user_query)
    else:
        # Otherwise, use the standard fast Llama3 model for chat
        response = ollama.chat(model='llama3', messages=[
            {'role': 'system', 'content': 'You are Jarvis.'},
            {'role': 'user', 'content': user_query}
        ])
        return response['message']['content']