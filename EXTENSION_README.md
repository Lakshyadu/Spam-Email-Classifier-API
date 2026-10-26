# Spam Classifier Chrome Extension - Setup

## 1. Add the API to your project
Copy `api.py` into the ROOT of your project (same folder as `app.py`).

## 2. Run the API
```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```
Check http://localhost:8000/docs and test `/predict`.

## 3. Load the extension in Chrome
1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder
4. Pin it from the puzzle-piece icon

## 4. Use it
- Click the icon, paste email text, press **Classify**.
- Open an email in Gmail: a green/red badge appears above the body.

## Deploying (optional)
- Use `Dockerfile.api` to host the API (Render, Railway, Hugging Face Spaces).
- In the extension popup > Server settings, enter your HTTPS URL.
- Add that URL to `host_permissions` in `extension/manifest.json`.
- Restrict CORS in `api.py` and add an API key before making it public.

## Privacy
The extension sends email text to your API server. Disclose this if you publish it.
