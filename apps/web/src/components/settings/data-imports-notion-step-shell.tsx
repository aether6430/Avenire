"use client";

import type { DataImportsDestinationRuntime } from "@/components/settings/data-imports-model";
import { DataImportsNotionStep } from "@/components/settings/data-imports-notion-step";
import { useDataImportsNotion } from "@/components/settings/use-data-imports-notion";

export function DataImportsNotionStepShell({
  destinationRuntime,
}: {
  destinationRuntime: DataImportsDestinationRuntime;
}) {
  const notionRuntime = useDataImportsNotion({
    ensureSavedDestination: destinationRuntime.ensureSavedDestination,
    loadOverview: destinationRuntime.loadOverview,
    notionStatus: destinationRuntime.notionStatus,
  });

  return (
    <DataImportsNotionStep
      destinationProps={destinationRuntime.destinationProps}
      notionImporting={notionRuntime.notionImporting}
      notionImportStatus={notionRuntime.notionImportStatus}
      notionLoading={notionRuntime.notionLoading}
      notionPages={notionRuntime.notionPages}
      onConnectNotion={notionRuntime.connectNotion}
      onImportSelectedNotionPages={
        notionRuntime.handleImportSelectedNotionPages
      }
      onLoadNotionPages={notionRuntime.handleLoadNotionPages}
      onToggleNotionPage={notionRuntime.toggleNotionPage}
      selectedNotionPageIds={notionRuntime.selectedNotionPageIds}
      selectedPagesCount={notionRuntime.selectedPagesCount}
      status={destinationRuntime.notionStatus}
    />
  );
}
