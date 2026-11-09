import os
from dotenv import load_dotenv
from google import genai

load_dotenv("keyAPI.env")
API_KEY = os.environ.get("GEMINI_API_KEY", "")
print("Using API KEY starting with:", API_KEY[:8])

client = genai.Client(api_key=API_KEY)
try:
    for m in client.models.list():
        print(m.name)
except Exception as e:
    print("Error:", e)
