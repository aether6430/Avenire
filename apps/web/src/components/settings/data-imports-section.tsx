"use client";

import type { WorkspaceSummary } from "@/components/settings/data-imports-model";
import { DataImportsSurface } from "@/components/settings/data-imports-surface";
import { useDataImports } from "@/components/settings/use-data-imports";

export function DataImportsSection({
  workspaces,
}: {
  workspaces: WorkspaceSummary[];
}) {
  const surfaceProps = useDataImports({ workspaces });
  return <DataImportsSurface {...surfaceProps} />;
}
