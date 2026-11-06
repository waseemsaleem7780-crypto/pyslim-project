import json
import os
import urllib.parse
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from magic_hour import Client

load_dotenv()

# Config se dynamic model load karo
def load_model_config():
    try:
        with open("config.json", "r") as f:
            config = json.load(f)
        return config.get("current_model", "gpt-oss-120b")
    except (FileNotFoundError, json.JSONDecodeError):
        return "gpt-oss-120b"  # Fallback (purana model)

ACTIVE_MODEL = load_model_config()

llm = ChatOpenAI(
    model=ACTIVE_MODEL,
    api_key=os.getenv("CEREBRAS_API_KEY"),
    base_url="https://api.cerebras.ai/v1",
    temperature=0
)

# Baaki sab kuch waisa hi rahega
def get_image_url(prompt: str):
    encoded = urllib.parse.quote(prompt)
    return f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true"

def generate_video(prompt: str):
    client = Client(token=os.getenv("MAGIC_HOUR_API_KEY"))
    result = client.v1.text_to_video.generate(
        style={"prompt": prompt},
        model="ltx-2.5",
        end_seconds=3,
        resolution="480p",
        aspect_ratio="16:9",
        wait_for_completion=True,
        download_outputs=True,
        download_directory="./static/videos/"
    )
    return f"http://127.0.0.1:8000/static/videos/{os.path.basename(result.downloaded_paths[0])}"