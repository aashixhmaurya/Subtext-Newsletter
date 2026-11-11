const $ = (id) => document.getElementById(id);
let clip = null;

function grab() {
  const selection = String(getSelection()).trim();
  const root = document.querySelector("article, [itemprop=articleBody], main") || document.body;
  return {
    url: location.href,
    title: document.querySelector('meta[property="og:title"]')?.content || document.title,
    text: (selection || root.innerText).replace(/\n{3,}/g, "\n\n").slice(0, 20000),
    partial: !!selection,
  };
}

async function init() {
  const { base = "http://localhost:3000" } = await chrome.storage.sync.get("base");
  $("base").value = base;
  $("base").addEventListener("change", (e) => chrome.storage.sync.set({ base: e.target.value.replace(/\/+$/, "") }));

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: grab });
    clip = result;
    const words = (clip.text.match(/\S+/g) || []).length;
    $("title").textContent = clip.title;
    $("meta").textContent = `${new URL(clip.url).hostname.replace(/^www\./, "")} · ${words.toLocaleString()} words${clip.partial ? " selected" : ""}`;
    $("save").disabled = false;
  } catch {
    $("title").textContent = tab?.title || "This page";
    $("meta").textContent = "Couldn't read the page text here. Subtext will fetch it from the link.";
    clip = { url: tab?.url || "", title: tab?.title || "", text: "" };
    $("save").disabled = !/^https?:/.test(clip.url);
  }
}

$("save").addEventListener("click", async () => {
  const base = ($("base").value || "http://localhost:3000").replace(/\/+$/, "");
  const payload = encodeURIComponent(JSON.stringify({ url: clip.url, title: clip.title, text: clip.text }));
  $("save").disabled = true;
  $("status").textContent = "Saving…";
  const tab = await chrome.tabs.create({ url: `${base}/capture#${payload}`, active: false });
  const done = (id, info) => {
    if (id !== tab.id || info.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(done);
    setTimeout(() => {
      chrome.tabs.remove(tab.id);
      $("status").textContent = "Saved. It will appear in your open story.";
      setTimeout(() => window.close(), 1000);
    }, 700);
  };
  chrome.tabs.onUpdated.addListener(done);
});

init();
