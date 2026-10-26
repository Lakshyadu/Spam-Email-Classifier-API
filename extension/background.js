// Service worker: makes the API calls so content scripts avoid CORS / mixed-content issues.
const DEFAULT_API = "http://localhost:8000";

async function getApiBase() {
  const { apiBase } = await chrome.storage.sync.get("apiBase");
  return (apiBase || DEFAULT_API).replace(/\/+$/, "");
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "CLASSIFY") {
    (async () => {
      try {
        const base = await getApiBase();
        const r = await fetch(`${base}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: msg.text.slice(0, 20000) })
        });
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        sendResponse(await r.json());
      } catch (e) {
        sendResponse({ error: e.message });
      }
    })();
    return true; // keep channel open for async response
  }
});
