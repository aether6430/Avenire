export const DEFAULT_APP_ORIGIN = "https://avenire.space";
export const APP_ORIGIN_KEY = "avenire:appOrigin";
export const AUTH_COMPLETE_KEY = "avenire:authCompleteAt";
export const SELECTED_DESTINATION_KEY = "avenire:selectedDestinationId";
export const CLIP_SETTINGS_KEY = "avenire:clipSettings";

export const DEFAULT_CLIP_SETTINGS = {
  includeCaptureProperties: true,
  includeSourceProperties: true,
};

export function normalizeOrigin(value) {
  const normalized = String(value ?? "").trim().replace(/\/+$/, "");
  return normalized || DEFAULT_APP_ORIGIN;
}

export function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });
}

export function storageSet(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => resolve());
  });
}

export function sendToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

export async function getStoredAppOrigin() {
  const stored = await storageGet([APP_ORIGIN_KEY]);
  return normalizeOrigin(stored[APP_ORIGIN_KEY]);
}

export async function setStoredAppOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  await storageSet({ [APP_ORIGIN_KEY]: normalized });
  return normalized;
}

export async function getStoredClipSettings() {
  const stored = await storageGet([CLIP_SETTINGS_KEY]);
  const value = stored[CLIP_SETTINGS_KEY];

  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return { ...DEFAULT_CLIP_SETTINGS };
  }

  return {
    ...DEFAULT_CLIP_SETTINGS,
    ...value,
  };
}

export async function setStoredClipSettings(settings) {
  const nextSettings = {
    ...DEFAULT_CLIP_SETTINGS,
    ...(settings ?? {}),
  };
  await storageSet({ [CLIP_SETTINGS_KEY]: nextSettings });
  return nextSettings;
}

export async function api(appOrigin, path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${normalizeOrigin(appOrigin)}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
}

export async function readErrorMessage(response, fallback) {
  try {
    const payload = await response.json();
    if (typeof payload?.error === "string" && Array.isArray(payload?.issues) && payload.issues.length > 0) {
      const firstIssue = payload.issues[0];
      if (typeof firstIssue?.message === "string") {
        return `${payload.error}: ${firstIssue.message}`;
      }
    }

    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function deriveSourceMode(context) {
  if (context.highlights.length > 0) {
    return "highlights";
  }

  if (context.selectionText) {
    return "selection";
  }

  return "article";
}

export function buildClipMarkdown(context, noteTitle) {
  const title = noteTitle.trim() || context.page.title;
  const capturedAt = new Date().toISOString();
  const lines = [`# ${title}`, "", `Source: [${context.page.title}](${context.page.url})`];

  if (context.page.siteName) {
    lines.push(`Site: ${context.page.siteName}`);
  }
  if (context.page.byline) {
    lines.push(`Author: ${context.page.byline}`);
  }
  if (context.page.publishedAt) {
    lines.push(`Published: ${context.page.publishedAt}`);
  }

  lines.push(`Captured: ${capturedAt}`, "");

  if (context.highlights.length > 0) {
    lines.push("## Highlights", "");
    for (const highlight of context.highlights) {
      lines.push(`> ${highlight.text}`, "");
    }
    return { capturedAt, content: lines.join("\n").trim() };
  }

  const body = context.selectionText || context.articleText;
  lines.push("## Content", "", body);
  return { capturedAt, content: lines.join("\n").trim() };
}

function addTextProperty(properties, key, value) {
  if (!(typeof value === "string" && value.trim())) {
    return;
  }

  properties[key] = { type: "text", value: value.trim() };
}

function addSelectProperty(properties, key, value) {
  if (!(typeof value === "string" && value.trim())) {
    return;
  }

  properties[key] = { type: "select", value: value.trim() };
}

export function buildClipPageProperties(context, capturedAt, settings) {
  const properties = {};
  const sourceMode = deriveSourceMode(context);

  if (settings.includeCaptureProperties) {
    addSelectProperty(properties, "Clip Type", "web-clip");
    addSelectProperty(properties, "Source Mode", sourceMode);
    addTextProperty(properties, "Captured At", capturedAt);
  }

  if (settings.includeSourceProperties) {
    addTextProperty(properties, "Source URL", context.page.url);
    addTextProperty(properties, "Source Title", context.page.title);
    addTextProperty(properties, "Source Site", context.page.siteName);
    addTextProperty(properties, "Source Author", context.page.byline);
    addTextProperty(properties, "Published At", context.page.publishedAt);
  }

  return properties;
}

export function buildClipRegisterPayload({
  content,
  context,
  destination,
  noteTitle,
  settings,
}) {
  const title = noteTitle.trim() || context.page.title;
  const fallback = buildClipMarkdown(context, title);
  const capturedAt = new Date().toISOString();
  const properties = buildClipPageProperties(context, capturedAt, settings);

  return {
    body: {
      content: content.trim() || fallback.content,
      folderId: destination.folderId,
      metadata: {
        type: "note",
        quickCapture: true,
        source: {
          byline: context.page.byline ?? null,
          capturedAt,
          kind: "web-clip",
          publishedAt: context.page.publishedAt ?? null,
          siteName: context.page.siteName ?? null,
          sourceMode: deriveSourceMode(context),
          title: context.page.title,
          url: context.page.url,
        },
        page: {
          bannerUrl: null,
          icon: null,
          properties,
        },
      },
      name: title,
    },
    workspaceId: destination.workspaceId,
  };
}

export function formatPropertyValue(property) {
  if (!property || typeof property !== "object") {
    return "";
  }

  if (property.type === "checkbox") {
    return property.value ? "True" : "False";
  }

  if (property.type === "multi_select" && Array.isArray(property.value)) {
    return property.value.join(", ");
  }

  if (property.value === null || property.value === undefined) {
    return "";
  }

  return String(property.value);
}
