const DEFAULT_APP_ORIGIN = "https://avenire.space";
const APP_ORIGIN_KEY = "avenire:appOrigin";
const AUTH_COMPLETE_KEY = "avenire:authCompleteAt";

async function openAuthTab(pathname) {
  const origin = await getAppOrigin();
  const callbackURL = `${origin}/auth/extension/success`;
  const url = new URL(pathname, `${origin}/`);
  url.searchParams.set("callbackURL", callbackURL);
  await chrome.tabs.create({ url: url.toString() });
}

function getStorageValue(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });
}

function setStorageValue(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => resolve());
  });
}

async function getAppOrigin() {
  const stored = await getStorageValue([APP_ORIGIN_KEY]);
  return typeof stored[APP_ORIGIN_KEY] === "string" && stored[APP_ORIGIN_KEY].trim()
    ? stored[APP_ORIGIN_KEY].trim().replace(/\/+$/, "")
    : DEFAULT_APP_ORIGIN;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "avenire.open-login") {
    void (async () => {
      await openAuthTab("/login");
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "avenire.open-register") {
    void (async () => {
      await openAuthTab("/register");
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "avenire.auth-complete") {
    void (async () => {
      await setStorageValue({ [AUTH_COMPLETE_KEY]: Date.now() });
      if (sender?.tab?.id) {
        await chrome.tabs.remove(sender.tab.id).catch(() => null);
      }
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "avenire.set-app-origin") {
    void setStorageValue({
      [APP_ORIGIN_KEY]: String(message.origin ?? DEFAULT_APP_ORIGIN).trim(),
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "avenire.get-app-origin") {
    void getAppOrigin().then((origin) => sendResponse({ origin }));
    return true;
  }

  sendResponse({ ok: false });
  return false;
});
