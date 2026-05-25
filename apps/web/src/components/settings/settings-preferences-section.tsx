import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avenire/ui/components/select";
import { useEffect, useState } from "react";
import { PetPreferencesFields } from "@/components/pets/pet-preferences-fields";
import {
  Divider,
  Section,
  ToggleRow,
} from "@/components/settings/settings-panel-content-shared";
import { getRemotePreferencesState } from "@/components/settings/settings-preferences-model";
import {
  type SettingsPanelRuntime,
  THEME_PREVIEW,
} from "@/components/settings/use-settings-panel";
import {
  DEFAULT_PET_NAME,
  getStoredPetVisibility,
  setStoredPetVisibility,
} from "@/lib/pet-preferences";
import { cn } from "@/lib/utils";

export function SettingsPreferencesSection({
  runtime,
}: {
  runtime: SettingsPanelRuntime;
}) {
  const [petVisible, setPetVisible] = useState(true);
  const {
    chatComposerSendMode,
    completedTasksAtTop,
    emailReceipts,
    persistUserSettings,
    preferencesErrorMessage,
    preferencesLoadFailed,
    preferencesLoading,
    preferencesStatus,
    privacyMode,
    setChatComposerSendMode,
    setCompletedTasksAtTop,
    setEmailReceipts,
    setPetAccessory,
    setPetName,
    setPrivacyMode,
    setTheme,
    theme,
    petAccessory,
    petName,
  } = runtime;
  const remotePreferencesState = getRemotePreferencesState({
    errorMessage: preferencesErrorMessage,
    loadFailed: preferencesLoadFailed,
    loading: preferencesLoading,
  });
  const showPreferencesStatus =
    preferencesStatus &&
    !(preferencesLoading || preferencesLoadFailed) &&
    !preferencesStatus.startsWith("Loading");

  useEffect(() => {
    setPetVisible(getStoredPetVisibility());
  }, []);

  return (
    <>
      <Section
        description="Control your account defaults and behavior."
        title="Preferences"
      >
        <div className="space-y-1">
          <ToggleRow
            checked={privacyMode}
            description="Blur personal details in settings until you click to reveal them."
            label="Privacy mode"
            onCheckedChange={(nextValue) => {
              setPrivacyMode(nextValue);
            }}
          />
          {remotePreferencesState.ready ? (
            <>
              <ToggleRow
                checked={emailReceipts}
                description="Send receipts to your account email when a payment succeeds."
                label="Email me receipts"
                onCheckedChange={(nextValue) => {
                  const previous = emailReceipts;
                  setEmailReceipts(nextValue);
                  void persistUserSettings({ emailReceipts: nextValue }, () =>
                    setEmailReceipts(previous)
                  );
                }}
              />
              <div className="flex flex-col gap-3 px-0 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm">Completed tasks</p>
                  <p className="text-muted-foreground text-xs">
                    Choose whether completed tasks stay at the top or drop to
                    the bottom in task lists.
                  </p>
                </div>
                <Select
                  onValueChange={(value) => {
                    const nextValue = value === "top";
                    const previous = completedTasksAtTop;
                    setCompletedTasksAtTop(nextValue);
                    void persistUserSettings(
                      { completedTasksAtTop: nextValue },
                      () => setCompletedTasksAtTop(previous)
                    );
                  }}
                  value={completedTasksAtTop ? "top" : "bottom"}
                >
                  <SelectTrigger className="w-full sm:w-[12rem]">
                    <SelectValue placeholder="Top" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <p className="mt-2 text-muted-foreground text-xs">
              {remotePreferencesState.message}
            </p>
          )}
          <div className="flex flex-col gap-3 px-0 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-sm">Chat send shortcut</p>
              <p className="text-muted-foreground text-xs">
                Enter can send immediately, or you can require Ctrl/Cmd+Enter.
                Shift+Enter always inserts a new line.
              </p>
            </div>
            <Select
              onValueChange={(value) => {
                setChatComposerSendMode(
                  value === "mod-enter" ? "mod-enter" : "enter"
                );
              }}
              value={chatComposerSendMode}
            >
              <SelectTrigger className="w-full sm:w-[12rem]">
                <SelectValue placeholder="Enter to send" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enter">Enter to send</SelectItem>
                <SelectItem value="mod-enter">Ctrl/Cmd+Enter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showPreferencesStatus ? (
            <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground text-xs">
              {preferencesStatus}
            </p>
          ) : null}
        </div>
      </Section>

      <Divider />

      <Section
        description="Name your pet and choose an accessory for workspace surfaces."
        title="Personalize pet"
      >
        <div className="space-y-5">
          <ToggleRow
            checked={petVisible}
            description="Hide or show the floating workspace pet on this device."
            label="Show workspace pet"
            onCheckedChange={(nextValue) => {
              setPetVisible(nextValue);
              setStoredPetVisibility(nextValue);
            }}
          />
          {remotePreferencesState.ready ? (
            <PetPreferencesFields
              accessory={petAccessory}
              accessoryDescription="Choose the accessory your pet should wear. This is saved to your account."
              name={petName}
              nameDescription="Give your pet a name that appears in methods and workspace surfaces."
              namePlaceholder="Enter a name"
              onAccessoryChange={(value) => {
                const previous = petAccessory;
                setPetAccessory(value);
                void persistUserSettings({ petAccessory: value }, () =>
                  setPetAccessory(previous)
                );
              }}
              onNameBlur={() => {
                const nextValue = petName.trim() || DEFAULT_PET_NAME;
                const previous = petName;
                setPetName(nextValue);
                void persistUserSettings({ petName: nextValue }, () =>
                  setPetName(previous)
                );
              }}
              onNameChange={setPetName}
            />
          ) : (
            <p className="text-muted-foreground text-xs">
              {remotePreferencesState.message}
            </p>
          )}
        </div>
      </Section>

      <Divider />

      <Section
        description="Select a light or dark theme for your workspace."
        title="Appearance"
      >
        <div className="grid max-w-md grid-cols-3 gap-3">
          <button
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-sm transition-colors hover:bg-muted/50",
              theme === "light"
                ? "border-primary bg-primary/5"
                : "border-border/60"
            )}
            onClick={() => setTheme("light")}
            type="button"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: THEME_PREVIEW.light.outer }}
            >
              <div
                className="h-5 w-5 rounded-full shadow-sm"
                style={{ backgroundColor: THEME_PREVIEW.light.inner }}
              />
            </div>
            <span className="font-medium">Light</span>
          </button>
          <button
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-sm transition-colors hover:bg-muted/50",
              theme === "dark"
                ? "border-primary bg-primary/5"
                : "border-border/60"
            )}
            onClick={() => setTheme("dark")}
            type="button"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: THEME_PREVIEW.dark.outer }}
            >
              <div
                className="h-5 w-5 rounded-full shadow-sm"
                style={{ backgroundColor: THEME_PREVIEW.dark.inner }}
              />
            </div>
            <span className="font-medium">Dark</span>
          </button>
          <button
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-sm transition-colors hover:bg-muted/50",
              theme === "system"
                ? "border-primary bg-primary/5"
                : "border-border/60"
            )}
            onClick={() => setTheme("system")}
            type="button"
          >
            <div className="flex h-10 w-10 overflow-hidden rounded-full">
              <div
                className="h-full w-1/2"
                style={{ backgroundColor: THEME_PREVIEW.light.outer }}
              />
              <div
                className="h-full w-1/2"
                style={{ backgroundColor: THEME_PREVIEW.dark.outer }}
              />
            </div>
            <span className="font-medium">System</span>
          </button>
        </div>
      </Section>
    </>
  );
}
