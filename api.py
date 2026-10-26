"""FastAPI wrapper for the spam-classifier extension.

The project originally expected a `PredictionPipeline` under `src/`, but that
code is not present in this workspace. The API should still start cleanly and
serve the extension by falling back to a lightweight heuristic model when the
real training pipeline is unavailable.
"""

import re
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from src.pipeline.prediction_pipeline import PredictionPipeline
except ImportError:
    PredictionPipeline = None


class Email(BaseModel):
    text: str


class FallbackPredictionPipeline:
    """Small heuristic fallback used when the ML pipeline is unavailable."""

    SPAM_WORDS: List[str] = [
        "free",
        "winner",
        "cash",
        "click",
        "urgent",
        "limited",
        "claim",
        "offer",
        "guaranteed",
        "prize",
        "win",
        "earn",
        "lottery",
        "act now",
        "exclusive",
        "instant",
    ]

    def __init__(self, load_models: bool = True):
        self.load_models = load_models

    def predict_single_email(self, text: str) -> Dict[str, object]:
        normalized = re.sub(r"\s+", " ", text or "").lower().strip()
        if not normalized:
            return {"prediction": "Ham", "confidence": 0.0}

        hits = sum(1 for word in self.SPAM_WORDS if word in normalized)
        total_words = len(re.findall(r"\b\w+\b", normalized)) or 1
        score = min(1.0, hits / max(1, total_words / 10))
        spam = score >= 0.08 or hits >= 2
        confidence = round(max(0.0, min(99.9, (score if spam else 1 - score) * 100)), 2)
        return {"prediction": "Spam" if spam else "Ham", "confidence": confidence}


app = FastAPI(title="Spam Email Classifier API")

# Chrome extensions call from chrome-extension:// origins, so allow all for local use.
# For a public deployment, restrict this and add an API key.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = PredictionPipeline(load_models=True) if PredictionPipeline else FallbackPredictionPipeline()


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/predict")
def predict(email: Email):
    text = (email.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty email text")

    try:
        result = pipeline.predict_single_email(text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    return {
        "prediction": result.get("prediction"),
        "confidence": result.get("confidence", 0),
    }
