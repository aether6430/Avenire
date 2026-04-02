import Defuddle from "defuddle";
import { createMarkdownContent } from "defuddle/full";

const HIGHLIGHT_NAME = "avenire-clipper";
const HIGHLIGHT_PREFIX = "avenire:highlights:";
const APP_ORIGIN_KEY = "avenire:appOrigin";
const EXTENSION_AUTH_SUCCESS_PATH = "/auth/extension/success";
let cachedExtraction = null;
let cachedExtractionUrl = null;

function storageKeyForPage() {
  return `${HIGHLIGHT_PREFIX}${normalizeUrl(window.location.href)}`;
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}

function getStorageValue(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

function setStorageValue(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => resolve());
  });
}

function removeStorageValue(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], () => resolve());
  });
}

function ensureHighlightStyle() {
  if (document.getElementById("avenire-clipper-highlight-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "avenire-clipper-highlight-style";
  style.textContent = `::highlight(${HIGHLIGHT_NAME}) { background: rgba(255, 214, 102, 0.72); color: inherit; }`;
  document.documentElement.appendChild(style);
}

function getElementIndex(node) {
  if (!node.parentNode) {
    return 1;
  }
  const siblings = Array.from(node.parentNode.childNodes).filter(
    (sibling) => sibling.nodeType === node.nodeType && sibling.nodeName === node.nodeName
  );
  return siblings.indexOf(node) + 1;
}

function getNodeXPath(node) {
  if (!node) {
    return null;
  }
  if (node.nodeType === Node.DOCUMENT_NODE) {
    return "";
  }
  if (node.nodeType === Node.TEXT_NODE) {
    const parentPath = getNodeXPath(node.parentNode);
    return `${parentPath}/text()[${getElementIndex(node)}]`;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const parentPath = getNodeXPath(node.parentNode);
    return `${parentPath}/${node.nodeName.toLowerCase()}[${getElementIndex(node)}]`;
  }
  return null;
}

function getNodeFromXPath(path) {
  if (!path) {
    return null;
  }

  const result = document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  return result.singleNodeValue;
}

function serializeRange(range) {
  const startXPath = getNodeXPath(range.startContainer);
  const endXPath = getNodeXPath(range.endContainer);
  if (!startXPath || !endXPath) {
    return null;
  }

  const text = range.toString().trim();
  if (!text) {
    return null;
  }

  return {
    endOffset: range.endOffset,
    endXPath,
    startOffset: range.startOffset,
    startXPath,
    text,
  };
}

function deserializeRange(serialized) {
  const startNode = getNodeFromXPath(serialized.startXPath);
  const endNode = getNodeFromXPath(serialized.endXPath);
  if (!startNode || !endNode) {
    return null;
  }

  const range = document.createRange();
  try {
    range.setStart(startNode, serialized.startOffset);
    range.setEnd(endNode, serialized.endOffset);
  } catch {
    return null;
  }

  return range;
}

async function getStoredHighlights() {
  const raw = await getStorageValue(storageKeyForPage());
  return Array.isArray(raw) ? raw : [];
}

async function getAppOrigin() {
  const stored = await getStorageValue(APP_ORIGIN_KEY);
  return typeof stored === "string" && stored.trim()
    ? stored.trim().replace(/\/+$/, "")
    : "https://avenire.space";
}

async function saveStoredHighlights(highlights) {
  if (!highlights.length) {
    await removeStorageValue(storageKeyForPage());
    return;
  }

  await setStorageValue({ [storageKeyForPage()]: highlights });
}

async function extractPageWithDefuddle() {
  const currentUrl = normalizeUrl(window.location.href);
  if (cachedExtractionUrl === currentUrl && cachedExtraction) {
    return cachedExtraction;
  }

  try {
    const parser = new DOMParser();
    const clonedDocument = parser.parseFromString(
      document.documentElement?.outerHTML ?? document.body?.outerHTML ?? "",
      "text/html"
    );
    const defuddle = new Defuddle(clonedDocument, {
      url: currentUrl,
      useAsync: false,
    });
    const extracted = defuddle.parse();
    const markdownContent = createMarkdownContent(extracted.content, currentUrl);
    cachedExtraction = {
      ...extracted,
      contentMarkdown: markdownContent,
    };
    cachedExtractionUrl = currentUrl;
    return cachedExtraction;
  } catch {
    cachedExtraction = null;
    cachedExtractionUrl = currentUrl;
    return null;
  }
}

async function getPageMetadata() {
  const getMeta = (name) =>
    document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.content?.trim() ?? "";

  const extracted = await extractPageWithDefuddle();
  const articleRoot =
    document.querySelector("main article") ||
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.body;
  const fallbackArticleText = articleRoot?.innerText?.replace(/\n{3,}/g, "\n\n").trim() ?? "";

  return {
    articleText:
      extracted?.contentMarkdown?.trim() ||
      extracted?.content?.trim() ||
      fallbackArticleText,
    byline: extracted?.author?.trim() || getMeta("author"),
    publishedAt:
      extracted?.published?.trim() ||
      getMeta("article:published_time") ||
      document.querySelector("time")?.getAttribute("datetime") ||
      "",
    selectionText: window.getSelection()?.toString().trim() ?? "",
    siteName: extracted?.site?.trim() || getMeta("og:site_name") || window.location.hostname,
    title: extracted?.title?.trim() || document.title.trim() || window.location.hostname,
    url: normalizeUrl(window.location.href),
  };
}

async function renderHighlights() {
  ensureHighlightStyle();
  const serialized = await getStoredHighlights();
  if (!globalThis.CSS?.highlights) {
    return serialized;
  }

  const highlight = new Highlight();
  const valid = [];

  for (const entry of serialized) {
    const range = deserializeRange(entry);
    if (!range || !range.toString().trim()) {
      continue;
    }

    highlight.add(range);
    valid.push({
      ...entry,
      text: range.toString().trim(),
    });
  }

  if (valid.length > 0) {
    CSS.highlights.set(HIGHLIGHT_NAME, highlight);
  } else {
    CSS.highlights.delete(HIGHLIGHT_NAME);
  }

  if (valid.length !== serialized.length) {
    await saveStoredHighlights(valid);
  }

  return valid;
}

async function addSelectionHighlight() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { error: "Select text on the page first." };
  }

  const serialized = serializeRange(selection.getRangeAt(0));
  if (!serialized) {
    return { error: "Unable to save that selection as a highlight." };
  }

  const existing = await getStoredHighlights();
  const duplicate = existing.some(
    (entry) =>
      entry.startXPath === serialized.startXPath &&
      entry.startOffset === serialized.startOffset &&
      entry.endXPath === serialized.endXPath &&
      entry.endOffset === serialized.endOffset
  );

  if (!duplicate) {
    existing.push(serialized);
    await saveStoredHighlights(existing);
  }

  selection.removeAllRanges();
  return { highlights: await renderHighlights() };
}

async function clearHighlights() {
  await removeStorageValue(storageKeyForPage());
  if (globalThis.CSS?.highlights) {
    CSS.highlights.delete(HIGHLIGHT_NAME);
  }
  return { highlights: [] };
}

async function getClipContext() {
  const metadata = await getPageMetadata();
  const highlights = await renderHighlights();
  return {
    articleText: metadata.articleText,
    highlights: highlights.map((entry, index) => ({
      order: index,
      quote: entry.text,
      text: entry.text,
    })),
    page: {
      byline: metadata.byline || null,
      publishedAt: metadata.publishedAt || null,
      siteName: metadata.siteName || null,
      title: metadata.title,
      url: metadata.url,
    },
    selectionText: metadata.selectionText,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "avenire.ping") {
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "avenire.get-context") {
    void getClipContext().then(sendResponse);
    return true;
  }

  if (message?.type === "avenire.add-highlight") {
    void addSelectionHighlight().then(sendResponse);
    return true;
  }

  if (message?.type === "avenire.clear-highlights") {
    void clearHighlights().then(sendResponse);
    return true;
  }

  return false;
});

async function maybeNotifyAuthComplete() {
  const appOrigin = await getAppOrigin();
  if (
    window.location.origin === appOrigin &&
    window.location.pathname === EXTENSION_AUTH_SUCCESS_PATH
  ) {
    chrome.runtime.sendMessage({ type: "avenire.auth-complete" }, () => {
      void chrome.runtime.lastError;
    });
  }
}

void renderHighlights();
void maybeNotifyAuthComplete();
