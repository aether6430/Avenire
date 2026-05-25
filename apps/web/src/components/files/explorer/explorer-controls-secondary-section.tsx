"use client";

import { Button } from "@avenire/ui/components/button";
import {
  type Filter,
  type FilterFieldConfig,
  Filters as PropertyFilters,
} from "@avenire/ui/components/filters";
import { SlidersHorizontal } from "@phosphor-icons/react/SlidersHorizontal";
import type { SortState } from "@/components/files/explorer/workspace-folder-browse-model";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import { ExplorerCardFieldsControl } from "./explorer-card-fields-control";
import { ExplorerSortControl } from "./explorer-sort-control";
import { ExplorerViewModeToggle } from "./explorer-view-mode-toggle";

export function ExplorerControlsSecondarySection({
  availablePropertyDefinitions,
  cardFieldQuery,
  cardPropertyKeys,
  filteredAvailablePropertyDefinitions,
  menuSurfaceClass,
  onCardFieldQueryChange,
  onCardFieldToggle,
  onClearCardFields,
  onPropertyFiltersChange,
  onResetCardFields,
  onSortChange,
  onViewModeChange,
  propertyFilterFields,
  propertyFiltersForUi,
  selectedCardPropertyDefinitions,
  sortState,
  viewMode,
}: {
  availablePropertyDefinitions: WorkspacePropertyDefinition[];
  cardFieldQuery: string;
  cardPropertyKeys: string[];
  filteredAvailablePropertyDefinitions: WorkspacePropertyDefinition[];
  menuSurfaceClass: string;
  onCardFieldQueryChange: (value: string) => void;
  onCardFieldToggle: (definitionKey: string, checked: boolean) => void;
  onClearCardFields: () => void;
  onPropertyFiltersChange: (nextFilters: Filter<string>[]) => void;
  onResetCardFields: () => void;
  onSortChange: (nextSortState: SortState) => void;
  onViewModeChange: (viewMode: "cards" | "list") => void;
  propertyFilterFields: FilterFieldConfig<string>[];
  propertyFiltersForUi: Filter<string>[];
  selectedCardPropertyDefinitions: WorkspacePropertyDefinition[];
  sortState: SortState;
  viewMode: "cards" | "list";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 max-[340px]:w-full max-[340px]:gap-y-2">
      <PropertyFilters
        fields={propertyFilterFields}
        filters={propertyFiltersForUi}
        onChange={onPropertyFiltersChange}
        size="sm"
        trigger={
          <Button
            className="h-7 rounded-md px-2 text-xs"
            size="sm"
            variant="outline"
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
          </Button>
        }
      />
      <ExplorerSortControl
        availablePropertyDefinitions={availablePropertyDefinitions}
        menuSurfaceClass={menuSurfaceClass}
        onSortChange={onSortChange}
        sortState={sortState}
      />
      <ExplorerCardFieldsControl
        cardFieldQuery={cardFieldQuery}
        cardPropertyKeys={cardPropertyKeys}
        filteredAvailablePropertyDefinitions={
          filteredAvailablePropertyDefinitions
        }
        menuSurfaceClass={menuSurfaceClass}
        onCardFieldQueryChange={onCardFieldQueryChange}
        onCardFieldToggle={onCardFieldToggle}
        onClearCardFields={onClearCardFields}
        onResetCardFields={onResetCardFields}
        selectedCardPropertyDefinitions={selectedCardPropertyDefinitions}
      />
      <ExplorerViewModeToggle
        onViewModeChange={onViewModeChange}
        viewMode={viewMode}
      />
    </div>
  );
}
