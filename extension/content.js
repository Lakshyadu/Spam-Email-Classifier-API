// Auto-classifies opened Gmail emails and shows a badge above the message body.
// Gmail's class names can change; if badges stop appearing, update BODY_SELECTOR.
const BODY_SELECTOR = "div.a3s.aiL";

function scan() {
  document.querySelectorAll(`${BODY_SELECTOR}:not([data-spam-checked])`).forEach((body) => {
    const text = body.innerText.trim();
    if (!text) return;
    body.setAttribute("data-spam-checked", "1");

    chrome.runtime.sendMessage({ type: "CLASSIFY", text }, (res) => {
      if (chrome.runtime.lastError || !res || res.error) return;
      const spam = res.prediction === "Spam";
      const conf = res.confidence ? ` (${Number(res.confidence).toFixed(0)}%)` : "";

      const badge = document.createElement("div");
      badge.textContent = (spam ? "🚨 Spam detected" : "✅ Looks safe") + conf;
      badge.style.cssText =
        "padding:6px 10px;margin-bottom:8px;border-radius:6px;font:bold 13px Arial;" +
        "color:#fff;background:" + (spam ? "#d93025" : "#188038") + ";";
      body.prepend(badge);
    });
  });
}

let timer = null;
new MutationObserver(() => {
  clearTimeout(timer);
  timer = setTimeout(scan, 400); // debounce Gmail's frequent DOM updates
}).observe(document.body, { childList: true, subtree: true });

scan();
