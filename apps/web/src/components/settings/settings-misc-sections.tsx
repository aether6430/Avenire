import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { Kbd, KbdGroup } from "@avenire/ui/components/kbd";
import { Spinner } from "@avenire/ui/components/spinner";
import {
  ArrowLeft,
  Key,
  ArrowClockwise as Refresh,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import type { DataImportsSurfaceProps } from "@/components/settings/data-imports-model";
import { DataImportsSourcePicker } from "@/components/settings/data-imports-source-picker";
import {
  Divider,
  Section,
} from "@/components/settings/settings-panel-content-shared";
import type { WorkspaceSummary } from "@/components/settings/settings-panel-model";
import { useDataImports } from "@/components/settings/use-data-imports";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";
import type { useSettingsPanelShortcuts } from "@/components/settings/use-settings-panel-shortcuts";

const DataImportsGoogleStepShell = dynamic(
  () =>
    import("@/components/settings/data-imports-google-step").then(
      (module) => module.DataImportsGoogleStepShell
    ),
  { loading: () => null, ssr: false }
);

const DataImportsNotionStepShell = dynamic(
  () =>
    import("@/components/settings/data-imports-notion-step").then(
      (module) => module.DataImportsNotionStepShell
    ),
  { loading: () => null, ssr: false }
);

export function DataImportsSurface({
  destinationRuntime,
  onBack,
  onSelectSource,
  selectedSource,
}: DataImportsSurfaceProps) {
  return (
    <div className="max-w-3xl space-y-6">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {selectedSource ? (
              <Button
                aria-label="Back to import sources"
                className="size-7 text-muted-foreground"
                onClick={onBack}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowLeft className="size-3.5" />
              </Button>
            ) : null}
            <div>
              <p className="font-medium text-sm">
                {selectedSource === "google"
                  ? "Google Drive"
                  : selectedSource === "notion"
                    ? "Notion"
                    : "Import data"}
              </p>
              {selectedSource ? null : (
                <p className="text-muted-foreground text-xs">
                  {destinationRuntime.overviewLoading
                    ? "Loading..."
                    : "Select a source to get started"}
                </p>
              )}
            </div>
          </div>
          <Button
            aria-label="Refresh import overview"
            onClick={() => void destinationRuntime.loadOverview()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {destinationRuntime.overviewLoading ? (
              <Spinner className="size-3.5" />
            ) : (
              <Refresh className="size-3.5" />
            )}
          </Button>
        </div>

        {selectedSource ? (
          selectedSource === "google" ? (
            <DataImportsGoogleStepShell
              destinationRuntime={destinationRuntime}
            />
          ) : (
            <DataImportsNotionStepShell
              destinationRuntime={destinationRuntime}
            />
          )
        ) : (
          <DataImportsSourcePicker
            googleStatus={destinationRuntime.googleStatus}
            notionStatus={destinationRuntime.notionStatus}
            onSelect={onSelectSource}
          />
        )}

        {destinationRuntime.overviewStatus ? (
          <div className="text-muted-foreground text-xs">
            {destinationRuntime.overviewStatus}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function SettingsDataSection({
  runtime,
  workspaces,
}: {
  runtime: SettingsPanelRuntime;
  workspaces: WorkspaceSummary[];
}) {
  const surfaceProps = useDataImports({ workspaces });

  return (
    <>
      <Section
        description="Connect external sources and import them through the existing note and upload pipelines."
        title="Data Imports"
      >
        <DataImportsSurface {...surfaceProps} />
      </Section>

      <Divider />

      <Section
        description="How workspace data is retained and cleaned up."
        title="Data Retention"
      >
        <div className="max-w-md space-y-2">
          <p className="text-muted-foreground text-sm">
            Deleted files and folders are moved to Trash and retained for 30
            days before permanent cleanup.
          </p>
        </div>
      </Section>
    </>
  );
}

export function SettingsShortcutsSection({
  filteredShortcutCount,
  filteredShortcutGroups,
  setShortcutQuery,
  shortcutQuery,
}: {
  filteredShortcutCount: number;
  filteredShortcutGroups: ReturnType<
    typeof useSettingsPanelShortcuts
  >["filteredShortcutGroups"];
  setShortcutQuery: (value: string) => void;
  shortcutQuery: string;
}) {
  return (
    <Section
      description="Implemented shortcuts available in Avenire."
      title="Keyboard Shortcuts"
    >
      <div className="max-w-3xl space-y-4">
        <div className="border-border/60 border-b pb-3">
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
            <Key className="size-3.5 text-muted-foreground" />
            <Input
              aria-label="Search shortcuts"
              className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
              onChange={(event) => {
                setShortcutQuery(event.target.value);
              }}
              placeholder="Search shortcuts..."
              value={shortcutQuery}
            />
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
              {filteredShortcutCount} total
            </span>
          </div>
        </div>

        {filteredShortcutCount === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No shortcuts match that search.
          </div>
        ) : (
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            {filteredShortcutGroups.map((group) => (
              <div key={group.name}>
                <div className="mb-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                  {group.name}
                </div>
                <ul className="flex flex-col">
                  {group.items.map((shortcut) => (
                    <li
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-foreground/[0.03]"
                      key={shortcut.label}
                    >
                      <span className="text-sm">{shortcut.label}</span>
                      <KbdGroup className="shrink-0">
                        {shortcut.keys.map((key) => (
                          <Kbd
                            className="border border-border/80 bg-muted/80"
                            key={`${shortcut.label}-${key}`}
                          >
                            {key}
                          </Kbd>
                        ))}
                      </KbdGroup>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
