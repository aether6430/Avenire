"use client";

import { Button } from "@avenire/ui/components/button";
import { Checkbox } from "@avenire/ui/components/checkbox";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import { Spinner } from "@avenire/ui/components/spinner";
import {
  Folder,
  LinkIcon,
  ArrowClockwise as Refresh,
} from "@phosphor-icons/react";
import { DownloadSimple as Download } from "@phosphor-icons/react/DownloadSimple";
import type { DataImportsNotionStepProps } from "./data-imports-model";
import {
  EMPTY_IMPORT_PROVIDER_STATUS,
  formatImportTimestamp,
  getImportProviderStateLabel,
} from "./data-imports-model";
import {
  DataImportsDestinationFields,
  ImportProviderStatusIcon,
} from "./data-imports-shared";

export function DataImportsNotionStep({
  destinationProps,
  notionImportStatus,
  notionImporting,
  notionLoading,
  notionPages,
  onConnectNotion,
  onImportSelectedNotionPages,
  onLoadNotionPages,
  onToggleNotionPage,
  selectedNotionPageIds,
  selectedPagesCount,
  status,
}: DataImportsNotionStepProps) {
  const resolvedStatus = status ?? EMPTY_IMPORT_PROVIDER_STATUS;

  return (
    <div className="space-y-5 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted/40">
          <Folder className="size-4 text-foreground/70" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">Notion</p>
            <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5">
              <ImportProviderStatusIcon status={resolvedStatus} />
              <span className="text-[11px] text-muted-foreground">
                {getImportProviderStateLabel(status)}
              </span>
            </div>
          </div>
          {status?.accountId ? (
            <p className="mt-0.5 text-muted-foreground text-xs">
              {status.accountId}
            </p>
          ) : null}
          {notionImportStatus ? (
            <p className="mt-1 text-muted-foreground text-xs">
              {notionImportStatus}
            </p>
          ) : null}
        </div>
        <Button
          disabled={!status?.configured}
          onClick={() => void onConnectNotion()}
          size="sm"
          type="button"
          variant={status?.ready ? "outline" : "default"}
        >
          <LinkIcon className="size-3.5" />
          {status?.connected ? "Reconnect" : "Connect"}
        </Button>
      </div>

      {status?.ready ? (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-foreground/70 text-xs">
                Pages
                {notionPages.length > 0
                  ? ` · ${selectedPagesCount} of ${notionPages.length} selected`
                  : ""}
              </p>
              <Button
                disabled={notionLoading || !status.ready}
                onClick={() => void onLoadNotionPages()}
                size="sm"
                type="button"
                variant="ghost"
              >
                {notionLoading ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <Refresh className="size-3.5" />
                )}
                {notionPages.length > 0 ? "Reload" : "Load pages"}
              </Button>
            </div>

            {notionPages.length > 0 ? (
              <ScrollArea className="max-h-56 rounded-xl border border-border/60">
                <div className="divide-y divide-border/60">
                  {notionPages.map((page) => {
                    const checked = selectedNotionPageIds.includes(page.id);

                    return (
                      <label
                        className="flex cursor-pointer items-start gap-3 px-3.5 py-3 transition-colors hover:bg-muted/20"
                        key={page.id}
                      >
                        <Checkbox
                          checked={checked}
                          className="mt-0.5"
                          onCheckedChange={() => onToggleNotionPage(page.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate font-medium text-sm">
                              {page.title}
                            </p>
                            <span className="shrink-0 text-muted-foreground text-xs">
                              {formatImportTimestamp(page.lastEditedTime)}
                            </span>
                          </div>
                          {page.url ? (
                            <a
                              className="mt-0.5 inline-flex text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
                              href={page.url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Open in Notion
                            </a>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="rounded-xl border border-border/60 px-4 py-8 text-center text-muted-foreground text-sm">
                Load pages from Notion to start a selection.
              </div>
            )}
          </div>

          <DataImportsDestinationFields props={destinationProps} />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              disabled={
                notionImporting ||
                selectedPagesCount === 0 ||
                !destinationProps.hasSelectedDestination
              }
              onClick={() => void onImportSelectedNotionPages()}
              size="sm"
              type="button"
            >
              {notionImporting ? (
                <Spinner className="size-3.5" />
              ) : (
                <Download className="size-3.5" />
              )}
              Import{" "}
              {selectedPagesCount > 0
                ? `${selectedPagesCount} page${selectedPagesCount === 1 ? "" : "s"}`
                : "selected"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
