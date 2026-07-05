import os
import base64
import httpx
from dotenv import load_dotenv

load_dotenv()

VLM_PROVIDER = os.environ.get("VLM_PROVIDER", "ollama")
OLLAMA_URL = "http://localhost:11434/api/generate"
# Add Anthropic, Gemini, or GPT Key

async def query_ollama(frame_bytes: bytes, prompt: str):
    img_b64 = base64.b64encode(frame_bytes).decode("utf-8")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(OLLAMA_URL, json={
            "model": "moondream",
            "prompt": prompt,
            "images": [img_b64],
            "stream": False,
            "options": {
                "num_predict": 100, # max tokens to generate
            }
        })
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()

async def query_ollama_text(prompt: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(OLLAMA_URL, json={
            "model": "moondream",
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 100,
            }
        })
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()
    
# add other async functions for query claude, gemini, GPT
# async def query_claude(frame_bytes: bytes, prompt: str) -> str:
#     async with httpx.AsyncClient(timeout=30.0) as client:
#         response = await client.post(
#             "https://api.anthropic.com/v1/messages",
#             headers={
#                 "x-api-key": ANTHROPIC_API_KEY,
#                 "anthropic-version": "2023-06-01",
#                 "content-type": "application/json",
#             },
#             json={
#                 "model": "claude-haiku-4-5-20251001",
#                 "max_tokens": 200,
#                 "messages": [{
#                     "role": "user",
#                     "content": prompt
#                 }],
#             },
#         )
#         response.raise_for_status()
#         data = response.json()
#         return data["content"][0]["text"].strip()

async def query_llama(prompt: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(OLLAMA_URL, json={
            "model": "llama3.2",
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": 100},
        })
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()

async def query_vlm(frame_bytes: bytes, prompt: str):
    if VLM_PROVIDER == "claude": # or gemini, GPT
        ...
    return await query_ollama(frame_bytes, prompt)

async def query_vlm_text(prompt: str):
    if VLM_PROVIDER == "claude": # or gemini, GPT
        ...
    return await query_ollama_text(prompt)

async def query_text_model(prompt: str):
    return await query_llama(prompt)