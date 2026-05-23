import { Input } from "@avenire/ui/components/input";
import { Kbd, KbdGroup } from "@avenire/ui/components/kbd";
import { Key } from "@phosphor-icons/react";
import { DataImportsSurface } from "@/components/settings/data-imports-surface";
import {
  Divider,
  Section,
} from "@/components/settings/settings-panel-content-shared";
import type { WorkspaceSummary } from "@/components/settings/settings-panel-model";
import { useDataImports } from "@/components/settings/use-data-imports";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";
import type { useSettingsPanelShortcuts } from "@/components/settings/use-settings-panel-shortcuts";

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
