"use client";

import type { Filter, FilterFieldConfig } from "@avenire/ui/components/filters";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EXPLORER_MAX_VISIBLE_CARD_PROPERTIES } from "@/components/files/explorer/explorer-controls-model";
import type { PropertyFilterState } from "@/components/files/explorer/explorer-file-properties-model";
import {
  buildDefaultExplorerCardPropertyKeys,
  buildExplorerAvailablePropertyDefinitions,
  deserializeExplorerPropertyFilters,
  filterExplorerAvailablePropertyDefinitions,
  getExplorerPropertyFilterDefaultOperator,
  getExplorerPropertyFilterFieldType,
  getExplorerPropertyFilterOperators,
  selectExplorerCardPropertyDefinitions,
  serializeExplorerPropertyFilters,
  toggleExplorerCardPropertyKey,
} from "@/components/files/explorer/explorer-property-controls-model";
import type { FileRecord } from "@/components/files/explorer/shared";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";

const FILE_CARD_FIELD_STORAGE_PREFIX = "file-explorer-card-fields:v1:";

interface UseExplorerPropertyControlsOptions {
  allFiles: FileRecord[];
  propertyDefinitions: WorkspacePropertyDefinition[];
  workspaceUuid: string;
}

export function useExplorerPropertyControls({
  allFiles,
  propertyDefinitions,
  workspaceUuid,
}: UseExplorerPropertyControlsOptions) {
  const [cardPropertyKeys, setCardPropertyKeys] = useState<string[]>([]);
  const [cardFieldQuery, setCardFieldQuery] = useState("");
  const [propertyFilters, setPropertyFilters] = useState<PropertyFilterState[]>(
    []
  );
  const loadedCardPropertySelectionRef = useRef(false);

  const availablePropertyDefinitions = useMemo(
    () =>
      buildExplorerAvailablePropertyDefinitions(allFiles, propertyDefinitions),
    [allFiles, propertyDefinitions]
  );
  const propertyDefinitionByKey = useMemo(
    () =>
      new Map(
        availablePropertyDefinitions.map((definition) => [
          definition.key,
          definition,
        ])
      ),
    [availablePropertyDefinitions]
  );
  const propertyFilterFields = useMemo<FilterFieldConfig<string>[]>(
    () =>
      availablePropertyDefinitions.map((definition) => ({
        key: definition.key,
        label: definition.key,
        options: definition.options.map((option) => ({
          label: option,
          value: option,
        })),
        operators: getExplorerPropertyFilterOperators(definition.type),
        type: getExplorerPropertyFilterFieldType(definition.type),
        customRenderer:
          definition.type === "checkbox"
            ? ({ operator }) => (
                <span className="text-muted-foreground">
                  {operator === "is_true" ? "True" : "False"}
                </span>
              )
            : undefined,
        defaultOperator: getExplorerPropertyFilterDefaultOperator(
          definition.type
        ),
      })),
    [availablePropertyDefinitions]
  );
  const propertyFiltersForUi = useMemo(
    () => serializeExplorerPropertyFilters(propertyFilters),
    [propertyFilters]
  );
  const handlePropertyFiltersChange = useCallback(
    (nextFilters: Filter<string>[]) => {
      setPropertyFilters(
        deserializeExplorerPropertyFilters(nextFilters, propertyDefinitionByKey)
      );
    },
    [propertyDefinitionByKey]
  );
  const cardPropertyStorageKey = useMemo(
    () =>
      workspaceUuid
        ? `${FILE_CARD_FIELD_STORAGE_PREFIX}${workspaceUuid}`
        : null,
    [workspaceUuid]
  );
  const selectedCardPropertyDefinitions = useMemo(
    () =>
      selectExplorerCardPropertyDefinitions(
        availablePropertyDefinitions,
        cardPropertyKeys
      ),
    [availablePropertyDefinitions, cardPropertyKeys]
  );
  const filteredAvailablePropertyDefinitions = useMemo(
    () =>
      filterExplorerAvailablePropertyDefinitions(
        availablePropertyDefinitions,
        cardFieldQuery
      ),
    [availablePropertyDefinitions, cardFieldQuery]
  );

  useEffect(() => {
    loadedCardPropertySelectionRef.current = false;
    setCardPropertyKeys([]);
  }, []);

  useEffect(() => {
    if (!cardPropertyStorageKey || availablePropertyDefinitions.length === 0) {
      return;
    }

    const validKeys = new Set(
      availablePropertyDefinitions.map((definition) => definition.key)
    );

    try {
      const raw = window.localStorage.getItem(cardPropertyStorageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (Array.isArray(parsed)) {
        const next = parsed
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0 && validKeys.has(entry))
          .slice(0, EXPLORER_MAX_VISIBLE_CARD_PROPERTIES);
        if (next.length > 0) {
          setCardPropertyKeys(next);
          loadedCardPropertySelectionRef.current = true;
          return;
        }
      }
    } catch {
      // Ignore invalid persisted state and fall back to defaults.
    }

    setCardPropertyKeys(
      buildDefaultExplorerCardPropertyKeys(availablePropertyDefinitions)
    );
    loadedCardPropertySelectionRef.current = true;
  }, [availablePropertyDefinitions, cardPropertyStorageKey]);

  useEffect(() => {
    if (!(cardPropertyStorageKey && loadedCardPropertySelectionRef.current)) {
      return;
    }

    window.localStorage.setItem(
      cardPropertyStorageKey,
      JSON.stringify(cardPropertyKeys)
    );
  }, [cardPropertyKeys, cardPropertyStorageKey]);

  const handleCardFieldQueryChange = useCallback((value: string) => {
    setCardFieldQuery(value);
  }, []);

  const handleCardFieldToggle = useCallback(
    (definitionKey: string, checked: boolean) => {
      setCardPropertyKeys((current) =>
        toggleExplorerCardPropertyKey(current, definitionKey, checked)
      );
    },
    []
  );

  const clearCardFields = useCallback(() => {
    setCardPropertyKeys([]);
  }, []);

  const resetCardFields = useCallback(() => {
    setCardPropertyKeys(
      buildDefaultExplorerCardPropertyKeys(availablePropertyDefinitions)
    );
  }, [availablePropertyDefinitions]);

  return {
    availablePropertyDefinitions,
    cardFieldQuery,
    cardPropertyKeys,
    clearCardFields,
    filteredAvailablePropertyDefinitions,
    handleCardFieldQueryChange,
    handleCardFieldToggle,
    handlePropertyFiltersChange,
    propertyFilters,
    propertyFilterFields,
    propertyFiltersForUi,
    resetCardFields,
    selectedCardPropertyDefinitions,
  };
}
