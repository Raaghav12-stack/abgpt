from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pdf2image import convert_from_path
from typing import List, Generator
import uuid
import os
import io
from openai import OpenAI
import base64
from fastapi.middleware.cors import CORSMiddleware

# Vision to Text (Placeholder for Vision Model API call)
import requests

# Embeddings + Vector Store
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import json

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="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",
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VECTOR_DIR = "vector_store"
SAVE_DIR = "./saved_pages"
os.makedirs(SAVE_DIR, exist_ok=True)
app.mount("/pages", StaticFiles(directory=SAVE_DIR), name="pages")

# Load embedding model (local)
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
# Directory to hold image pages
# os.makedirs("tmp/pages", exist_ok=True)
os.makedirs(VECTOR_DIR, exist_ok=True)

faiss_index = None
metadata_store = []
conversation_history = []


if os.path.exists(os.path.join(VECTOR_DIR, "faiss.index")):
    faiss_index = faiss.read_index(os.path.join(VECTOR_DIR, "faiss.index"))
else:
    faiss_index = faiss.IndexFlatL2(384)

if os.path.exists(os.path.join(VECTOR_DIR, "metadata.json")):
    with open(os.path.join(VECTOR_DIR, "metadata.json"), "r") as f:
        metadata_store = json.load(f)
else:
    metadata_store = []



def vision_model_inference(image_bytes: bytes) -> str:
    """Call OpenRouter vision endpoint with image using OpenAI SDK."""
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    completion = client.chat.completions.create(
        model="moonshotai/kimi-vl-a3b-thinking:free",
        extra_headers={
            "HTTP-Referer": "your-app-url",
            "X-Title": "FinanceRAG"
        },
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract all financial and operational insights from this image."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                ]
            }
        ]
    )
    return completion.choices[0].message.content

def llm_generate_contextual_answer(prompt: str) -> str:
    """Call OpenRouter LLM for contextual answer generation using OpenAI SDK."""
    completion = client.chat.completions.create(
        model="deepseek/deepseek-r1:free",
        extra_headers={
            "HTTP-Referer": "your-app-url",
            "X-Title": "FinanceRAG"
        },
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    return completion.choices[0].message.content


@app.get("/process")
def process_pdf(pdf_path: str = Query(...), company: str = Query("Unknown")):
    statuses = []
    pages = convert_from_path(pdf_path, dpi=100)

    for i, page in enumerate(pages[:10]):
        page_path = os.path.join(SAVE_DIR, f"{uuid.uuid4().hex}.png")
        page.save(page_path, format="PNG")

        with open(page_path, "rb") as img_f:
            vision_text = vision_model_inference(img_f.read())

            embedding = embedding_model.encode([vision_text])[0]
            faiss_index.add(np.array([embedding]))
            metadata_store.append({
                "company": company,
                "page": i + 1,
                "text": vision_text,
                "image_path": page_path
            })

        statuses.append({
            "page": i + 1,
            "image_path": page_path,
            "summary": vision_text[:100] + "..."  # Optional preview
        })

    # Save FAISS and metadata
    faiss.write_index(faiss_index, os.path.join(VECTOR_DIR, "faiss.index"))
    with open(os.path.join(VECTOR_DIR, "metadata.json"), "w") as f:
        json.dump(metadata_store, f)

    return {
        "status": "completed",
        "company": company,
        "pages_processed": len(statuses)
    }


@app.get("/search")
def search_docs(query: str, top_k: int = 3):
    print(query)
    query_vector = embedding_model.encode([query])
    print(query_vector)
    D, I = faiss_index.search(np.array(query_vector), k=top_k)

    context_chunks = []
    source_images = []

    for idx in I[0]:
        meta = metadata_store[idx]
        print(meta["image_path"])
        context_chunks.append(f"[Company: {meta['company']} | Page {meta['page']}]: {meta['text']}")
        source_images.append({
            "company": meta["company"],
            "page": meta["page"],
            # "image_path": meta["image_path"]
        })

    context_prompt = "\n\n".join(context_chunks)
    memory_context = "\n\n".join([
        f"[Q]: {item['query']}\n[A]: {item['response'][:500]}..." for item in conversation_history[-4:] 
    ])

    final_prompt = f""" You are ABGpt, a financial expert who has all the knowledge of ABC as well as it's competitors. Your role is to act as a financial advisor.
                        You have the following memory:\n{memory_context}\n\nNow answer the question: {query}\n\nContext:\n{context_prompt}. Make sure the content generated does not contain any special characters like ** , ## , --. You also need to handle regular/general queries."""

    response = llm_generate_contextual_answer(final_prompt)

    # Append latest query and response to conversation history
    conversation_history.append({
        "query": query,
        "response": response
    })
    if len(conversation_history) > 5:
        conversation_history.pop(0)

    return JSONResponse({"response": response, "sources": source_images})