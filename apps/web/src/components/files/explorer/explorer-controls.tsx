"use client";

import type { Filter, FilterFieldConfig } from "@avenire/ui/components/filters";
import { ExplorerControlsPrimarySection } from "@/components/files/explorer/explorer-controls-primary-section";
import { ExplorerControlsSecondarySection } from "@/components/files/explorer/explorer-controls-secondary-section";
import type { SortState } from "@/components/files/explorer/workspace-folder-browse-model";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";

interface ExplorerControlsProps {
  availablePropertyDefinitions: WorkspacePropertyDefinition[];
  canNavigateUp: boolean;
  canRedoFileOperation: boolean;
  canUndoFileOperation: boolean;
  cardFieldQuery: string;
  cardPropertyKeys: string[];
  currentFolderId: string;
  currentLocationTitle: string;
  fileOperationHistoryBusy: boolean;
  filteredAvailablePropertyDefinitions: WorkspacePropertyDefinition[];
  isCurrentFolderReadOnly: boolean;
  isMobile: boolean;
  menuSurfaceClass: string;
  onCardFieldQueryChange: (value: string) => void;
  onCardFieldToggle: (definitionKey: string, checked: boolean) => void;
  onClearCardFields: () => void;
  onCreateFolder: (folderId: string) => void;
  onCreateNote: (folderId: string) => void;
  onImportLink: (folderId: string) => void;
  onNavigateUp: () => void;
  onOpenMobileCreateMenu: () => void;
  onPropertyFiltersChange: (nextFilters: Filter<string>[]) => void;
  onRedo: () => void;
  onResetCardFields: () => void;
  onSortChange: (nextSortState: SortState) => void;
  onUndo: () => void;
  onUploadFile: () => void;
  onUploadFolder: () => void;
  onViewModeChange: (viewMode: "cards" | "list") => void;
  propertyFilterFields: FilterFieldConfig<string>[];
  propertyFiltersForUi: Filter<string>[];
  selectedCardPropertyDefinitions: WorkspacePropertyDefinition[];
  sortState: SortState;
  viewMode: "cards" | "list";
}

export function ExplorerControls({
  availablePropertyDefinitions,
  canNavigateUp,
  canRedoFileOperation,
  canUndoFileOperation,
  cardFieldQuery,
  cardPropertyKeys,
  currentFolderId,
  currentLocationTitle,
  fileOperationHistoryBusy,
  filteredAvailablePropertyDefinitions,
  isCurrentFolderReadOnly,
  isMobile,
  menuSurfaceClass,
  onCardFieldQueryChange,
  onCardFieldToggle,
  onClearCardFields,
  onCreateFolder,
  onCreateNote,
  onImportLink,
  onNavigateUp,
  onOpenMobileCreateMenu,
  onPropertyFiltersChange,
  onRedo,
  onResetCardFields,
  onSortChange,
  onUndo,
  onUploadFile,
  onUploadFolder,
  onViewModeChange,
  propertyFilterFields,
  propertyFiltersForUi,
  selectedCardPropertyDefinitions,
  sortState,
  viewMode,
}: ExplorerControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4">
      <ExplorerControlsPrimarySection
        canNavigateUp={canNavigateUp}
        canRedoFileOperation={canRedoFileOperation}
        canUndoFileOperation={canUndoFileOperation}
        currentFolderId={currentFolderId}
        currentLocationTitle={currentLocationTitle}
        fileOperationHistoryBusy={fileOperationHistoryBusy}
        isCurrentFolderReadOnly={isCurrentFolderReadOnly}
        isMobile={isMobile}
        menuSurfaceClass={menuSurfaceClass}
        onCreateFolder={onCreateFolder}
        onCreateNote={onCreateNote}
        onImportLink={onImportLink}
        onNavigateUp={onNavigateUp}
        onOpenMobileCreateMenu={onOpenMobileCreateMenu}
        onRedo={onRedo}
        onUndo={onUndo}
        onUploadFile={onUploadFile}
        onUploadFolder={onUploadFolder}
      />
      <ExplorerControlsSecondarySection
        availablePropertyDefinitions={availablePropertyDefinitions}
        cardFieldQuery={cardFieldQuery}
        cardPropertyKeys={cardPropertyKeys}
        filteredAvailablePropertyDefinitions={
          filteredAvailablePropertyDefinitions
        }
        menuSurfaceClass={menuSurfaceClass}
        onCardFieldQueryChange={onCardFieldQueryChange}
        onCardFieldToggle={onCardFieldToggle}
        onClearCardFields={onClearCardFields}
        onPropertyFiltersChange={onPropertyFiltersChange}
        onResetCardFields={onResetCardFields}
        onSortChange={onSortChange}
        onViewModeChange={onViewModeChange}
        propertyFilterFields={propertyFilterFields}
        propertyFiltersForUi={propertyFiltersForUi}
        selectedCardPropertyDefinitions={selectedCardPropertyDefinitions}
        sortState={sortState}
        viewMode={viewMode}
      />
    </div>
  );
}
