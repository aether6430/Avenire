import { useMemo, useState } from "react";
import type {
  DataImportsSurfaceProps,
  SelectedImportSource,
  WorkspaceSummary,
} from "@/components/settings/data-imports-model";
import { useDataImportsDestination } from "@/components/settings/use-data-imports-destination";

export function useDataImports({
  workspaces,
}: {
  workspaces: WorkspaceSummary[];
}): DataImportsSurfaceProps {
  const [selectedSource, setSelectedSource] =
    useState<SelectedImportSource>(null);
  const destinationRuntime = useDataImportsDestination({ workspaces });

  return useMemo(
    () => ({
      destinationRuntime,
      onBack: () => setSelectedSource(null),
      onSelectSource: setSelectedSource,
      selectedSource,
    }),
    [destinationRuntime, selectedSource]
  );
}
