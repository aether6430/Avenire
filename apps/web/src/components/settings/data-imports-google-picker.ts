"use client";

declare global {
  interface Window {
    gapi?: {
      load: (
        name: string,
        options: (() => void) | { callback?: () => void; onerror?: () => void }
      ) => void;
    };
    google?: {
      picker?: {
        Action: { PICKED: string };
        DocsView: new (
          viewId: unknown
        ) => {
          setIncludeFolders: (value: boolean) => unknown;
          setMode: (value: unknown) => unknown;
          setSelectFolderEnabled: (value: boolean) => unknown;
        };
        DocsViewMode: { LIST: unknown };
        Feature: { MULTISELECT_ENABLED: unknown };
        PickerBuilder: new () => {
          addView: (view: unknown) => unknown;
          enableFeature: (feature: unknown) => unknown;
          setAppId: (appId: string) => unknown;
          setCallback: (callback: (data: any) => void) => unknown;
          setDeveloperKey: (key: string) => unknown;
          setOAuthToken: (token: string) => unknown;
          build: () => { setVisible: (value: boolean) => void };
        };
        Response: { ACTION: string; DOCUMENTS: string };
        ViewId: { DOCS: unknown };
      };
    };
  }
}

type GooglePickerApi = NonNullable<NonNullable<typeof window.google>["picker"]>;

function loadGoogleScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is unavailable."));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Unable to load ${src}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => reject(new Error(`Unable to load ${src}`)),
      { once: true }
    );
    document.head.appendChild(script);
  });
}

async function ensureGooglePickerLoaded() {
  await loadGoogleScript("https://apis.google.com/js/api.js");

  if (typeof window === "undefined" || !window.gapi) {
    throw new Error("Google Picker library is unavailable.");
  }

  await new Promise<void>((resolve, reject) => {
    window.gapi?.load("picker", {
      callback: () => resolve(),
      onerror: () => reject(new Error("Unable to initialize Google Picker.")),
    });
  });

  const picker = window.google?.picker;
  if (!picker) {
    throw new Error("Google Picker is unavailable.");
  }

  return picker as GooglePickerApi;
}

export async function selectGoogleDriveImportFileIds({
  accessToken,
  apiKey,
  appId,
}: {
  accessToken: string;
  apiKey: string;
  appId?: string;
}) {
  const googlePicker = await ensureGooglePickerLoaded();

  return await new Promise<string[] | null>((resolve) => {
    const pickerView = new googlePicker.DocsView(googlePicker.ViewId.DOCS);
    pickerView.setIncludeFolders(false);
    pickerView.setSelectFolderEnabled(false);
    pickerView.setMode(googlePicker.DocsViewMode.LIST);

    const picker = (
      new googlePicker.PickerBuilder() as {
        addView: (view: unknown) => any;
        enableFeature: (feature: unknown) => any;
        setAppId: (appId: string) => any;
        setCallback: (callback: (data: any) => void) => any;
        setDeveloperKey: (key: string) => any;
        setOAuthToken: (token: string) => any;
        build: () => { setVisible: (value: boolean) => void };
      }
    )
      .addView(pickerView)
      .enableFeature(googlePicker.Feature.MULTISELECT_ENABLED)
      .setCallback((data: any) => {
        if (data[googlePicker.Response.ACTION] !== googlePicker.Action.PICKED) {
          resolve(null);
          return;
        }

        const documents = (data[googlePicker.Response.DOCUMENTS] ??
          []) as Array<{ id?: string }>;
        resolve(
          documents
            .map((entry) => entry.id?.trim())
            .filter((entry): entry is string => Boolean(entry))
        );
      })
      .setDeveloperKey(apiKey)
      .setOAuthToken(accessToken);

    if (appId) {
      picker.setAppId(appId);
    }

    picker.build().setVisible(true);
  });
}
