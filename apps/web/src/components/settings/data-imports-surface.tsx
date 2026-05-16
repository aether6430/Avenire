"use client";

import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import { ArrowLeft, ArrowClockwise as Refresh } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import type { DataImportsSurfaceProps } from "@/components/settings/data-imports-model";
import { DataImportsSourcePicker } from "./data-imports-source-picker";

const DataImportsGoogleStepShell = dynamic(
  () =>
    import("@/components/settings/data-imports-google-step-shell").then(
      (module) => module.DataImportsGoogleStepShell
    ),
  { loading: () => null, ssr: false }
);

const DataImportsNotionStepShell = dynamic(
  () =>
    import("@/components/settings/data-imports-notion-step-shell").then(
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
