import {
  api,
  APP_ORIGIN_KEY,
  AUTH_COMPLETE_KEY,
  CLIP_SETTINGS_KEY,
  getStoredAppOrigin,
  getStoredClipSettings,
  readErrorMessage,
  SELECTED_DESTINATION_KEY,
  sendToBackground,
  setStoredAppOrigin,
  setStoredClipSettings,
  storageGet,
  storageSet,
} from "./shared.js";

const state = {
  appOrigin: "",
  currentFolder: null,
  destinations: [],
  folderAncestors: [],
  folders: [],
  lastAuthCompleteAt: null,
  selectedDestinationId: "",
  selectedFolderId: null,
  settings: null,
  user: null,
  workspaces: [],
  workspaceId: "",
};

const els = {
  appOrigin: document.getElementById("app-origin"),
  authStatus: document.getElementById("auth-status"),
  createDestination: document.getElementById("create-destination"),
  defaultDestinationSelect: document.getElementById("default-destination-select"),
  deleteDestination: document.getElementById("delete-destination"),
  folderBreadcrumbs: document.getElementById("folder-breadcrumbs"),
  folderList: document.getElementById("folder-list"),
  includeCaptureProperties: document.getElementById("include-capture-properties"),
  includeSourceProperties: document.getElementById("include-source-properties"),
  openRegister: document.getElementById("open-register"),
  presetLabel: document.getElementById("preset-label"),
  presetSelect: document.getElementById("preset-select"),
  result: document.getElementById("result"),
  saveOrigin: document.getElementById("save-origin"),
  signIn: document.getElementById("sign-in"),
  signOut: document.getElementById("sign-out"),
  updateDestination: document.getElementById("update-destination"),
  workspaceSelect: document.getElementById("workspace-select"),
};

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

function renderAuth() {
  els.authStatus.textContent = state.user
    ? `Signed in as ${state.user.name ?? state.user.email}`
    : "Not signed in";
  els.signOut.disabled = !state.user;
}

function renderSettings() {
  els.appOrigin.value = state.appOrigin;
  els.includeSourceProperties.checked = Boolean(state.settings?.includeSourceProperties);
  els.includeCaptureProperties.checked = Boolean(state.settings?.includeCaptureProperties);
}

function renderDestinationSelects() {
  const defaultOptionLabel =
    state.destinations.length > 0 ? "Select a destination" : "Create a destination below";

  for (const select of [els.defaultDestinationSelect, els.presetSelect]) {
    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = defaultOptionLabel;
    select.appendChild(placeholder);

    for (const destination of state.destinations) {
      const option = document.createElement("option");
      option.value = destination.id;
      option.textContent = `${destination.label} • ${destination.workspaceName} / ${destination.folderName}`;
      option.selected = destination.id === state.selectedDestinationId;
      select.appendChild(option);
    }
  }
}

function renderWorkspaceOptions() {
  els.workspaceSelect.innerHTML = "";

  for (const workspace of state.workspaces) {
    const option = document.createElement("option");
    option.value = workspace.workspaceId;
    option.textContent = workspace.name;
    option.selected = workspace.workspaceId === state.workspaceId;
    els.workspaceSelect.appendChild(option);
  }
}

function renderFolderBrowser() {
  els.folderBreadcrumbs.innerHTML = "";
  const breadcrumbItems = [...state.folderAncestors, state.currentFolder].filter(Boolean);
  for (const folder of breadcrumbItems) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "breadcrumb-button";
    button.textContent = folder.name;
    button.addEventListener("click", () => {
      void loadFolders(state.workspaceId, folder.id);
    });
    els.folderBreadcrumbs.appendChild(button);
  }

  els.folderList.innerHTML = "";
  for (const folder of state.folders) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `folder-button${state.selectedFolderId === folder.id ? " active" : ""}`;
    button.textContent = folder.name;
    button.addEventListener("click", () => {
      state.selectedFolderId = folder.id;
      renderFolderBrowser();
    });
    button.addEventListener("dblclick", () => {
      void loadFolders(state.workspaceId, folder.id);
    });
    els.folderList.appendChild(button);
  }

  if (state.currentFolder) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `folder-button${state.selectedFolderId === state.currentFolder.id ? " active" : ""}`;
    button.textContent = `Use current folder: ${state.currentFolder.name}`;
    button.addEventListener("click", () => {
      state.selectedFolderId = state.currentFolder.id;
      renderFolderBrowser();
    });
    els.folderList.prepend(button);
  }
}

async function checkSession() {
  try {
    const response = await api(state.appOrigin, "/api/extension/me");
    if (!response.ok) {
      state.user = null;
      state.destinations = [];
      state.workspaces = [];
      state.currentFolder = null;
      state.folderAncestors = [];
      state.folders = [];
      state.selectedDestinationId = "";
      state.selectedFolderId = null;
      renderAuth();
      renderDestinationSelects();
      renderWorkspaceOptions();
      renderFolderBrowser();
      return false;
    }

    const payload = await response.json();
    state.user = payload.user ?? null;
    renderAuth();
    return Boolean(state.user);
  } catch {
    state.user = null;
    state.destinations = [];
    state.workspaces = [];
    state.currentFolder = null;
    state.folderAncestors = [];
    state.folders = [];
    state.selectedDestinationId = "";
    state.selectedFolderId = null;
    renderAuth();
    renderDestinationSelects();
    renderWorkspaceOptions();
    renderFolderBrowser();
    setResult("Unable to reach Avenire. Check the app origin and that the web app is running.", "error");
    return false;
  }
}

async function loadDestinations() {
  const response = await api(state.appOrigin, "/api/extension/destinations");
  if (!response.ok) {
    state.destinations = [];
    renderDestinationSelects();
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
  renderDestinationSelects();
}

async function loadWorkspaces() {
  const response = await api(state.appOrigin, "/api/extension/workspaces");
  if (!response.ok) {
    state.workspaces = [];
    renderWorkspaceOptions();
    return;
  }

  const payload = await response.json();
  state.workspaces = payload.workspaces ?? [];
  if (!state.workspaces.some((entry) => entry.workspaceId === state.workspaceId)) {
    state.workspaceId = state.workspaces[0]?.workspaceId ?? "";
  }
  renderWorkspaceOptions();
  if (state.workspaceId) {
    await loadFolders(state.workspaceId);
  }
}

async function loadFolders(workspaceId, parentId) {
  const query = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
  const response = await api(
    state.appOrigin,
    `/api/extension/workspaces/${workspaceId}/folders${query}`
  );
  if (!response.ok) {
    return;
  }

  const payload = await response.json();
  state.workspaceId = workspaceId;
  state.currentFolder = payload.currentFolder;
  state.folderAncestors = payload.ancestors ?? [];
  state.folders = payload.folders ?? [];
  state.selectedFolderId = state.selectedFolderId ?? payload.currentFolder?.id ?? null;
  renderFolderBrowser();
}

function syncEditorFromSelectedDestination() {
  const selected = state.destinations.find((entry) => entry.id === state.selectedDestinationId);
  if (!selected) {
    els.presetLabel.value = "";
    return;
  }

  els.presetLabel.value = selected.label;
  state.workspaceId = selected.workspaceId;
  state.selectedFolderId = selected.folderId;
  renderWorkspaceOptions();
  void loadFolders(selected.workspaceId, selected.folderId);
}

async function saveOrigin() {
  state.appOrigin = await setStoredAppOrigin(els.appOrigin.value);
  setResult(`Saved ${state.appOrigin}`, "success");
  await checkSession();
  if (state.user) {
    await Promise.all([loadDestinations(), loadWorkspaces()]);
  }
}

async function saveClipSettings() {
  state.settings = await setStoredClipSettings({
    includeCaptureProperties: els.includeCaptureProperties.checked,
    includeSourceProperties: els.includeSourceProperties.checked,
  });
  setResult("Property settings saved.", "success");
}

async function signOut() {
  await api(state.appOrigin, "/api/auth/sign-out", {
    body: JSON.stringify({}),
    method: "POST",
  }).catch(() => null);

  state.user = null;
  state.destinations = [];
  state.workspaces = [];
  state.currentFolder = null;
  state.folderAncestors = [];
  state.folders = [];
  state.selectedDestinationId = "";
  state.selectedFolderId = null;
  renderAuth();
  renderDestinationSelects();
  renderWorkspaceOptions();
  renderFolderBrowser();
  setResult("Signed out.", "success");
}

async function createDestination() {
  if (!state.user) {
    setResult("Sign in first.", "error");
    return;
  }
  if (!state.workspaceId || !state.selectedFolderId) {
    setResult("Choose a workspace and folder first.", "error");
    return;
  }

  const response = await api(state.appOrigin, "/api/extension/destinations", {
    body: JSON.stringify({
      folderId: state.selectedFolderId,
      label: els.presetLabel.value.trim(),
      workspaceId: state.workspaceId,
    }),
    method: "POST",
  });

  if (!response.ok) {
    const message = await readErrorMessage(response, "Unable to create the destination preset.");
    setResult(message, "error");
    return;
  }

  await loadDestinations();
  syncEditorFromSelectedDestination();
  setResult("Destination preset created.", "success");
}

async function updateDestination() {
  if (!state.selectedDestinationId || !state.workspaceId || !state.selectedFolderId) {
    setResult("Select a destination and folder first.", "error");
    return;
  }

  const response = await api(
    state.appOrigin,
    `/api/extension/destinations/${state.selectedDestinationId}`,
    {
      body: JSON.stringify({
        folderId: state.selectedFolderId,
        label: els.presetLabel.value.trim(),
        workspaceId: state.workspaceId,
      }),
      method: "PATCH",
    }
  );

  if (!response.ok) {
    const message = await readErrorMessage(response, "Unable to update the destination preset.");
    setResult(message, "error");
    return;
  }

  await loadDestinations();
  syncEditorFromSelectedDestination();
  setResult("Destination preset updated.", "success");
}

async function deleteDestination() {
  if (!state.selectedDestinationId) {
    setResult("Select a destination first.", "error");
    return;
  }

  const response = await api(
    state.appOrigin,
    `/api/extension/destinations/${state.selectedDestinationId}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const message = await readErrorMessage(response, "Unable to delete the destination preset.");
    setResult(message, "error");
    return;
  }

  state.selectedDestinationId = "";
  state.selectedFolderId = null;
  els.presetLabel.value = "";
  await loadDestinations();
  syncEditorFromSelectedDestination();
  setResult("Destination preset deleted.", "success");
}

async function initialize() {
  const stored = await storageGet([
    APP_ORIGIN_KEY,
    AUTH_COMPLETE_KEY,
    CLIP_SETTINGS_KEY,
    SELECTED_DESTINATION_KEY,
  ]);

  state.appOrigin = await getStoredAppOrigin();
  state.settings = await getStoredClipSettings();
  state.lastAuthCompleteAt =
    typeof stored[AUTH_COMPLETE_KEY] === "number" ? stored[AUTH_COMPLETE_KEY] : null;
  state.selectedDestinationId =
    typeof stored[SELECTED_DESTINATION_KEY] === "string" ? stored[SELECTED_DESTINATION_KEY] : "";

  renderSettings();
  renderAuth();
  renderDestinationSelects();

  const signedIn = await checkSession();
  if (signedIn) {
    await Promise.all([loadDestinations(), loadWorkspaces()]);
    syncEditorFromSelectedDestination();
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
      void initialize();
    }
  }
});

els.saveOrigin.addEventListener("click", () => {
  void saveOrigin();
});

els.signIn.addEventListener("click", () => {
  void sendToBackground({ type: "avenire.open-login" }).then(() => {
    setResult("Login tab opened.", "success");
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

els.includeSourceProperties.addEventListener("change", () => {
  void saveClipSettings();
});

els.includeCaptureProperties.addEventListener("change", () => {
  void saveClipSettings();
});

els.defaultDestinationSelect.addEventListener("change", (event) => {
  state.selectedDestinationId = event.target.value;
  void storageSet({ [SELECTED_DESTINATION_KEY]: state.selectedDestinationId });
  els.presetSelect.value = state.selectedDestinationId;
  syncEditorFromSelectedDestination();
});

els.presetSelect.addEventListener("change", (event) => {
  state.selectedDestinationId = event.target.value;
  els.defaultDestinationSelect.value = state.selectedDestinationId;
  void storageSet({ [SELECTED_DESTINATION_KEY]: state.selectedDestinationId });
  syncEditorFromSelectedDestination();
});

els.workspaceSelect.addEventListener("change", (event) => {
  state.workspaceId = event.target.value;
  state.selectedFolderId = null;
  void loadFolders(state.workspaceId);
});

els.createDestination.addEventListener("click", () => {
  void createDestination();
});

els.updateDestination.addEventListener("click", () => {
  void updateDestination();
});

els.deleteDestination.addEventListener("click", () => {
  void deleteDestination();
});

void initialize();
