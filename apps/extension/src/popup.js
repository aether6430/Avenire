import {
  api,
  AUTH_COMPLETE_KEY,
  buildClipMarkdown,
  buildClipPageProperties,
  buildClipRegisterPayload,
  deriveSourceMode,
  formatPropertyValue,
  getStoredAppOrigin,
  getStoredClipSettings,
  readErrorMessage,
  SELECTED_DESTINATION_KEY,
  sendToBackground,
  storageGet,
  storageSet,
} from "./shared.js";

const state = {
  appOrigin: "",
  destinations: [],
  lastAuthCompleteAt: null,
  selectedDestinationId: "",
  settings: null,
  sourceContext: null,
  user: null,
};

const els = {
  addHighlight: document.getElementById("add-highlight"),
  authPanel: document.getElementById("auth-panel"),
  authStatus: document.getElementById("auth-status"),
  clearHighlights: document.getElementById("clear-highlights"),
  clipNow: document.getElementById("clip-now"),
  destinationSelect: document.getElementById("destination-select"),
  metadataProperties: document.getElementById("metadata-properties"),
  noteContent: document.getElementById("note-content-field"),
  noteTitle: document.getElementById("note-title-field"),
  openRegister: document.getElementById("open-register"),
  openSettings: document.getElementById("open-settings"),
  refreshContext: document.getElementById("refresh-context"),
  result: document.getElementById("result"),
  signIn: document.getElementById("sign-in"),
  signOut: document.getElementById("sign-out"),
  signedInShell: document.getElementById("signed-in-shell"),
};

function activeTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      const tab = tabs[0];
      if (!tab?.id) {
        reject(new Error("No active tab available."));
        return;
      }

      resolve(tab);
    });
  });
}

function isInjectableTabUrl(url) {
  return typeof url === "string" && /^(https?:\/\/)/i.test(url);
}

async function ensureContentScriptLoaded(tab) {
  if (!isInjectableTabUrl(tab?.url)) {
    throw new Error("The clipper only works on normal http(s) web pages.");
  }

  try {
    await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: "avenire.ping" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(response);
      });
    });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Receiving end does not exist")) {
      throw error;
    }
  }

  await new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        files: ["content.js"],
        target: { tabId: tab.id },
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve();
      }
    );
  });
}

function sendToActiveTab(message) {
  return activeTab().then(async (tab) => {
    await ensureContentScriptLoaded(tab);

    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(response);
      });
    });
  });
}

function setResult(message, tone = "muted") {
  if (!message) {
    els.result.hidden = true;
    els.result.textContent = "";
    return;
  }

  els.result.hidden = false;
  els.result.textContent = message;
  els.result.style.color =
    tone === "error"
      ? "var(--destructive)"
      : tone === "success"
        ? "var(--foreground)"
        : "var(--muted-foreground)";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderVisibility() {
  const signedIn = Boolean(state.user);
  els.authPanel.hidden = signedIn;
  els.signedInShell.hidden = !signedIn;
}

function renderAuth() {
  if (state.user) {
    els.authStatus.textContent = `Signed in as ${state.user.name ?? state.user.email}`;
  } else {
    els.authStatus.textContent = "Sign in to Avenire before you clip anything from this page.";
  }

  renderVisibility();
}

function renderDestinationOptions() {
  els.destinationSelect.innerHTML = "";

  if (state.destinations.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Open settings to create a destination";
    els.destinationSelect.appendChild(option);
    els.clipNow.disabled = true;
    return;
  }

  for (const destination of state.destinations) {
    const option = document.createElement("option");
    option.value = destination.id;
    option.textContent = destination.label;
    option.selected = destination.id === state.selectedDestinationId;
    els.destinationSelect.appendChild(option);
  }

  els.clipNow.disabled = false;
}

function renderMetadata() {
  if (!state.sourceContext || !state.settings) {
    els.metadataProperties.innerHTML = `
      <div class="metadata-row">
        <span class="metadata-key">Status</span>
        <span class="metadata-value">No page context loaded yet.</span>
      </div>
    `;
    return;
  }

  const properties = buildClipPageProperties(
    state.sourceContext,
    new Date().toISOString(),
    state.settings
  );
  const rows = Object.entries(properties);

  if (rows.length === 0) {
    els.metadataProperties.innerHTML = `
      <div class="metadata-row">
        <span class="metadata-key">Status</span>
        <span class="metadata-value">No structured properties will be added for this clip.</span>
      </div>
    `;
    return;
  }

  els.metadataProperties.innerHTML = rows
    .map(
      ([key, property]) => `
        <div class="metadata-row">
          <span class="metadata-key">${escapeHtml(key)}</span>
          <span class="metadata-value">${escapeHtml(formatPropertyValue(property))}</span>
        </div>
      `
    )
    .join("");
}

function renderClipDraft() {
  if (!state.sourceContext) {
    els.noteTitle.value = "";
    els.noteContent.value = "";
    renderMetadata();
    return;
  }

  if (!els.noteTitle.value.trim()) {
    els.noteTitle.value = state.sourceContext.page.title;
  }

  if (!els.noteContent.value.trim()) {
    const draft = buildClipMarkdown(state.sourceContext, els.noteTitle.value);
    els.noteContent.value = draft.content;
  }

  renderMetadata();
}

async function checkSession() {
  try {
    const response = await api(state.appOrigin, "/api/extension/me");
    if (!response.ok) {
      state.user = null;
      renderAuth();
      return false;
    }

    const payload = await response.json();
    state.user = payload.user ?? null;
    renderAuth();
    return Boolean(state.user);
  } catch {
    state.user = null;
    renderAuth();
    setResult("Unable to reach Avenire. Check the extension settings and that the web app is running.", "error");
    return false;
  }
}

async function loadDestinations() {
  try {
    const response = await api(state.appOrigin, "/api/extension/destinations");
    if (!response.ok) {
      state.destinations = [];
      renderDestinationOptions();
      return;
    }

    const payload = await response.json();
    state.destinations = payload.destinations ?? [];
    const selectedStillExists = state.destinations.some(
      (entry) => entry.id === state.selectedDestinationId
    );
    state.selectedDestinationId = selectedStillExists
      ? state.selectedDestinationId
      : state.destinations[0]?.id ?? "";
    await storageSet({ [SELECTED_DESTINATION_KEY]: state.selectedDestinationId });
    renderDestinationOptions();
  } catch {
    setResult("Unable to load destination presets.", "error");
  }
}

async function refreshContext(resetDraft = true) {
  try {
    const context = await sendToActiveTab({ type: "avenire.get-context" });
    state.sourceContext = context;

    if (resetDraft) {
      els.noteTitle.value = context?.page?.title ?? "";
      const draft = context ? buildClipMarkdown(context, els.noteTitle.value) : null;
      els.noteContent.value = draft?.content ?? "";
    }

    renderClipDraft();
  } catch (error) {
    setResult(
      error?.message ?? "Unable to communicate with the active tab. Try a normal web page.",
      "error"
    );
  }
}

async function signOut() {
  await api(state.appOrigin, "/api/auth/sign-out", {
    body: JSON.stringify({}),
    method: "POST",
  }).catch(() => null);

  state.user = null;
  state.destinations = [];
  state.selectedDestinationId = "";
  state.sourceContext = null;
  els.noteTitle.value = "";
  els.noteContent.value = "";
  renderAuth();
  renderDestinationOptions();
  renderMetadata();
  setResult(null);
}

async function syncAfterAuthComplete() {
  const signedIn = await checkSession();
  if (!signedIn) {
    return;
  }

  setResult("Session detected. Loading clipper…", "success");
  await Promise.all([loadDestinations(), refreshContext()]);
  setResult(null);
}

async function clipNow() {
  if (!state.user) {
    setResult("Sign in first.", "error");
    return;
  }

  const destination = state.destinations.find(
    (entry) => entry.id === state.selectedDestinationId
  );
  if (!destination) {
    setResult("Open settings and create a destination first.", "error");
    return;
  }

  await refreshContext(false);
  if (!state.sourceContext) {
    setResult("No clip context available.", "error");
    return;
  }

  const payload = buildClipRegisterPayload({
    content: els.noteContent.value,
    context: state.sourceContext,
    destination,
    noteTitle: els.noteTitle.value,
    settings: state.settings,
  });

  const response = await api(
    state.appOrigin,
    `/api/workspaces/${payload.workspaceId}/files/register`,
    {
      body: JSON.stringify(payload.body),
      method: "POST",
    }
  );

  if (!response.ok) {
    const message = await readErrorMessage(
      response,
      "Clip failed. Check that your Avenire session is still active."
    );
    setResult(message, "error");
    return;
  }

  setResult("Clipped into Avenire.", "success");
}

async function initialize() {
  const stored = await storageGet([AUTH_COMPLETE_KEY, SELECTED_DESTINATION_KEY]);
  state.appOrigin = await getStoredAppOrigin();
  state.settings = await getStoredClipSettings();
  state.lastAuthCompleteAt =
    typeof stored[AUTH_COMPLETE_KEY] === "number" ? stored[AUTH_COMPLETE_KEY] : null;
  state.selectedDestinationId =
    typeof stored[SELECTED_DESTINATION_KEY] === "string" ? stored[SELECTED_DESTINATION_KEY] : "";

  const signedIn = await checkSession();
  if (signedIn) {
    await Promise.all([loadDestinations(), refreshContext()]);
  } else {
    renderMetadata();
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes[AUTH_COMPLETE_KEY]?.newValue) {
    const nextValue = changes[AUTH_COMPLETE_KEY].newValue;
    if (state.lastAuthCompleteAt !== nextValue) {
      state.lastAuthCompleteAt = nextValue;
      void syncAfterAuthComplete();
    }
  }
});

els.destinationSelect.addEventListener("change", (event) => {
  state.selectedDestinationId = event.target.value;
  void storageSet({ [SELECTED_DESTINATION_KEY]: state.selectedDestinationId });
});

els.refreshContext.addEventListener("click", () => {
  void refreshContext();
});

els.signIn.addEventListener("click", () => {
  void sendToBackground({ type: "avenire.open-login" }).then(() => {
    setResult("Login tab opened. Finish sign-in there and the clipper will update automatically.", "success");
  });
});

els.openRegister.addEventListener("click", () => {
  void sendToBackground({ type: "avenire.open-register" }).then(() => {
    setResult("Registration tab opened.", "success");
  });
});

els.signOut.addEventListener("click", () => {
  void signOut();
});

els.addHighlight.addEventListener("click", () => {
  void sendToActiveTab({ type: "avenire.add-highlight" })
    .then(() => refreshContext())
    .catch((error) => {
      setResult(error?.message ?? "Unable to save a highlight from this page.", "error");
    });
});

els.clearHighlights.addEventListener("click", () => {
  void sendToActiveTab({ type: "avenire.clear-highlights" })
    .then(() => refreshContext())
    .catch((error) => {
      setResult(error?.message ?? "Unable to clear highlights on this page.", "error");
    });
});

els.openSettings.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

els.clipNow.addEventListener("click", () => {
  void clipNow();
});

void initialize();
