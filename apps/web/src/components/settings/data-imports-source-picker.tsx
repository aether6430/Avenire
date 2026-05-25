"use client";

import { Folder, Globe } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import type {
  DataImportsSourcePickerProps,
  ImportProviderStatus,
} from "@/components/settings/data-imports-model";
import { getImportProviderStateLabel } from "@/components/settings/data-imports-model";
import { ImportProviderStatusIcon } from "@/components/settings/data-imports-shared";
import { cn } from "@/lib/utils";

function SourceCard({
  hint,
  icon: Icon,
  label,
  onSelect,
  status,
}: {
  hint: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onSelect: () => void;
  status: ImportProviderStatus | null;
}) {
  return (
    <button
      className={cn(
        "group flex w-full flex-col gap-2 px-0 py-2 text-left transition-colors duration-200",
        "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted/40">
            <Icon className="size-4 text-foreground/70" />
          </div>
          <div>
            <p className="font-medium text-sm">{label}</p>
            <p className="text-muted-foreground text-xs">{hint}</p>
          </div>
        </div>

        {status ? (
          <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5">
            <ImportProviderStatusIcon status={status} />
            <span className="text-[11px] text-muted-foreground">
              {getImportProviderStateLabel(status)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end">
        <span className="text-muted-foreground text-xs transition-colors group-hover:text-foreground">
          Select →
        </span>
      </div>
    </button>
  );
}

export function DataImportsSourcePicker({
  googleStatus,
  notionStatus,
  onSelect,
}: DataImportsSourcePickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Choose a source to import from
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <SourceCard
          hint="Files, Docs, Sheets"
          icon={Globe}
          label="Google Drive"
          onSelect={() => onSelect("google")}
          status={googleStatus}
        />
        <SourceCard
          hint="Pages, databases"
          icon={Folder}
          label="Notion"
          onSelect={() => onSelect("notion")}
          status={notionStatus}
        />
      </div>
    </div>
  );
}
