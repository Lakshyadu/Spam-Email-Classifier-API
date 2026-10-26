# Spam Email Classifier (API + Chrome Extension)

A spam email detection project made up of two parts:

1. **A FastAPI backend** (`api.py`) that exposes a `/predict` endpoint for classifying email text as **Spam** or **Ham** (not spam).
2. **A Chrome extension** (`extension/`) that sends email text to the API and shows the result, either in a popup or as a green/red badge directly inside Gmail.

If the trained ML pipeline is not available, the API automatically falls back to a lightweight keyword-based heuristic, so the server always starts and the extension always works.

---

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Installation](#installation)
- [Running the API](#running-the-api)
- [API Reference](#api-reference)
- [Loading the Chrome Extension](#loading-the-chrome-extension)
- [Using the Extension](#using-the-extension)
- [Fallback Heuristic Model](#fallback-heuristic-model)
- [Docker](#docker)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [Privacy](#privacy)
- [Troubleshooting](#troubleshooting)
- [Roadmap / Ideas](#roadmap--ideas)

---

## Features

- Classify any email text as `Spam` or `Ham` with a confidence score
- REST API built with FastAPI, with automatic interactive docs at `/docs`
- Chrome extension with a popup for pasting text manually
- Automatic Gmail badge (green = ham, red = spam) shown above the email body
- Graceful fallback to a heuristic classifier when the ML pipeline is missing
- CORS enabled so Chrome extension origins can call the API
- Ready-to-use `Dockerfile.api` for containerized hosting
- Configurable server URL from the extension popup (local or deployed)

---

## How It Works

```
 Chrome Extension  ──(POST /predict, email text)──►  FastAPI (api.py)
 (popup / Gmail)                                          │
        ▲                                                 ▼
        │                                  PredictionPipeline (src/...)
        │                                     if available (ML model)
        │                                                 │
        └──────── {prediction, confidence} ◄──── else FallbackPredictionPipeline
                                                    (keyword heuristic)
```

1. The extension collects email text (from the popup or the open Gmail message).
2. It sends the text to the API's `/predict` endpoint.
3. The API tries to use `PredictionPipeline` from `src/pipeline/prediction_pipeline.py`. If that import fails, it uses the built-in `FallbackPredictionPipeline`.
4. The API returns the label and a confidence score, which the extension displays.

---

## Project Structure

```
.
├── api.py                 # FastAPI app (the /health and /predict endpoints)
├── app.py                 # Existing project app (api.py lives next to it)
├── extension/             # Chrome extension (manifest, popup, content scripts)
│   └── manifest.json
├── src/                   # ML training/prediction code (optional, see below)
│   └── pipeline/
│       └── prediction_pipeline.py
├── requirements.txt       # Python dependencies
├── Dockerfile.api         # Container image for the API
├── EXTENSION_README.md    # Short extension setup guide
├── .gitignore
└── README.md
```

> **Note:** The `src/pipeline/prediction_pipeline.py` module may not be present in every workspace. The API is designed to work either way.

---

## Requirements

- Python 3.12 (the Docker image uses `python:3.12-slim`; other recent 3.x versions should also work)
- Google Chrome (or a Chromium-based browser) for the extension
- Python packages from `requirements.txt`:
  - `fastapi`
  - `uvicorn`
  - `scikit-learn`
  - `pandas`
  - `numpy`
  - `joblib`
  - `beautifulsoup4`

---

## Installation

1. **Clone or copy the project**, then open a terminal in the project root.

2. **Create and activate a virtual environment** (recommended):

   ```bash
   python -m venv .venv

   # Linux / macOS
   source .venv/bin/activate

   # Windows (PowerShell)
   .venv\Scripts\Activate.ps1
   ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Make sure `api.py` is in the root of the project**, in the same folder as `app.py`.

---

## Running the API

Start the server:

```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

For development with auto-reload:

```bash
uvicorn api:app --reload --port 8000
```

Then verify it works:

- Health check: http://localhost:8000/health
- Interactive docs (Swagger UI): http://localhost:8000/docs

---

## API Reference

### `GET /health`

Simple liveness check.

**Response**

```json
{ "status": "ok" }
```

### `POST /predict`

Classify a single email.

**Request body**

```json
{
  "text": "Congratulations! You are the winner of a free prize. Click now to claim."
}
```

**Successful response (200)**

```json
{
  "prediction": "Spam",
  "confidence": 87.5
}
```

| Field        | Type   | Description                                          |
|--------------|--------|------------------------------------------------------|
| `prediction` | string | Either `"Spam"` or `"Ham"`                           |
| `confidence` | number | Confidence score, expressed as a percentage (0-100)  |

**Error responses**

| Status | Meaning                                              |
|--------|------------------------------------------------------|
| 400    | The `text` field was empty or whitespace only        |
| 422    | Invalid request body (for example, missing `text`)   |
| 500    | The prediction pipeline raised an error              |

**Example with curl**

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Urgent! Claim your free cash prize now"}'
```

**Example with Python**

```python
import requests

resp = requests.post(
    "http://localhost:8000/predict",
    json={"text": "Meeting moved to 3pm tomorrow, see agenda attached."},
)
print(resp.json())  # {'prediction': 'Ham', 'confidence': 100.0}
```

---

## Loading the Chrome Extension

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `extension/` folder.
4. Click the puzzle-piece icon in the toolbar and **pin** the extension.

Make sure the API is running before using the extension.

---

## Using the Extension

**Popup mode**

1. Click the extension icon.
2. Paste the email text into the box.
3. Press **Classify** to see the prediction and confidence.

**Gmail mode**

- Open any email in Gmail. A badge appears above the email body:
  - **Green** means the email looks like Ham (not spam)
  - **Red** means the email looks like Spam

**Changing the server URL**

Open the popup, go to **Server settings**, and enter the URL of your API (for example `http://localhost:8000` locally, or your HTTPS URL once deployed).

---

## Fallback Heuristic Model

When `src.pipeline.prediction_pipeline.PredictionPipeline` cannot be imported, the API uses `FallbackPredictionPipeline`. It works like this:

1. The text is lowercased and whitespace is normalized.
2. Empty text returns `Ham` with confidence `0.0`.
3. The classifier counts how many words or phrases from a spam keyword list appear in the text (for example: `free`, `winner`, `cash`, `click`, `urgent`, `limited`, `claim`, `offer`, `guaranteed`, `prize`, `win`, `earn`, `lottery`, `act now`, `exclusive`, `instant`).
4. A score is computed from the number of hits relative to the email length.
5. The email is labeled **Spam** if the score is at least `0.08` or there are two or more keyword hits. Otherwise it is **Ham**.

This is a simple rule-based approach and will produce false positives and false negatives. For real-world accuracy, add the trained ML pipeline under `src/`.

### Plugging in the real ML pipeline

Provide a class at `src/pipeline/prediction_pipeline.py` with this interface:

```python
class PredictionPipeline:
    def __init__(self, load_models: bool = True): ...

    def predict_single_email(self, text: str) -> dict:
        # must return: {"prediction": "Spam" | "Ham", "confidence": float}
        ...
```

No changes to `api.py` are needed. It detects the class automatically at startup.

---

## Docker

Build and run the API in a container:

```bash
docker build -f Dockerfile.api -t spam-classifier-api .
docker run -p 8000:8000 spam-classifier-api
```

The image is based on `python:3.12-slim`, installs the packages from `requirements.txt`, copies the project, and starts Uvicorn on port `8000`.

---

## Deployment

You can host the API on platforms such as Render, Railway, or Hugging Face Spaces using `Dockerfile.api`.

After deploying:

1. Copy your public **HTTPS** URL.
2. In the extension popup, open **Server settings** and enter that URL.
3. Add the URL to `host_permissions` in `extension/manifest.json`, for example:

   ```json
   "host_permissions": [
     "http://localhost:8000/*",
     "https://your-api.example.com/*"
   ]
   ```

4. Reload the extension from `chrome://extensions`.

---

## Security Notes

- `api.py` currently allows **all CORS origins** (`allow_origins=["*"]`), which is convenient for local use because Chrome extensions call from `chrome-extension://` origins.
- **Before making the API public**, you should:
  - Restrict allowed origins
  - Add an API key or other authentication
  - Add rate limiting
  - Serve only over HTTPS

---

## Privacy

The extension sends email text to the API server you configure. If you run the server yourself, the text stays under your control. If you publish the extension or host a shared API, clearly disclose to users that email content is transmitted to a server, and avoid logging or storing email content.

---

## Troubleshooting

| Problem | Possible fix |
|---------|--------------|
| Extension shows a network error | Check the API is running and the server URL in the popup is correct |
| `ModuleNotFoundError: fastapi` | Activate your virtual environment and run `pip install -r requirements.txt` |
| `Address already in use` | Another process is using port 8000; use `--port 8001` and update the extension setting |
| Gmail badge does not appear | Reload the extension, then refresh the Gmail tab |
| Deployed API is blocked by Chrome | Add the URL to `host_permissions` in `manifest.json` and reload the extension |
| All results look like Ham or Spam | You are probably using the fallback heuristic; add the trained pipeline under `src/` |
| 400 "Empty email text" | The request body had no text; make sure the extension is sending the email content |

---

## Roadmap / Ideas

- Train and ship the full ML pipeline (TF-IDF + scikit-learn model) under `src/`
- Add API key authentication and rate limiting
- Add unit tests for the API and fallback model
- Support batch prediction (`/predict/batch`)
- Show the top spam-indicating words in the extension
- Publish the extension to the Chrome Web Store

---

## License

Add your preferred license here (for example MIT).
