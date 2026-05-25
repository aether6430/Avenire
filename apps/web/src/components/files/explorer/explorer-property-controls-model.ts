import type { Filter } from "@avenire/ui/components/filters";
import {
  EXPLORER_DEFAULT_VISIBLE_CARD_PROPERTIES,
  EXPLORER_MAX_VISIBLE_CARD_PROPERTIES,
} from "@/components/files/explorer/explorer-controls-model";
import {
  getFileProperties,
  type PropertyFilterOperator,
  type PropertyFilterState,
} from "@/components/files/explorer/explorer-file-properties-model";
import type { FileRecord } from "@/components/files/explorer/shared";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";

export function buildExplorerAvailablePropertyDefinitions(
  files: FileRecord[],
  definitions: WorkspacePropertyDefinition[]
) {
  const merged = new Map<string, WorkspacePropertyDefinition>(
    definitions.map((definition) => [definition.key, definition])
  );

  for (const file of files) {
    for (const [key, property] of Object.entries(getFileProperties(file))) {
      const existing = merged.get(key);
      const options =
        property.type === "multi_select"
          ? property.value
          : property.type === "select" && property.value
            ? [property.value]
            : [];
      if (!existing) {
        merged.set(key, {
          key,
          options,
          type: property.type,
        });
        continue;
      }

      merged.set(key, {
        ...existing,
        options: Array.from(new Set([...existing.options, ...options])).sort(
          (left, right) => left.localeCompare(right)
        ),
      });
    }
  }

  return Array.from(merged.values()).sort((left, right) =>
    left.key.localeCompare(right.key)
  );
}

export function getExplorerPropertyFilterOperators(
  type: WorkspacePropertyDefinition["type"]
): { label: string; value: PropertyFilterOperator }[] {
  switch (type) {
    case "checkbox":
      return [
        { label: "is true", value: "is_true" },
        { label: "is false", value: "is_false" },
      ];
    case "date":
    case "number":
      return [
        { label: "is", value: "eq" },
        { label: "greater than", value: "gt" },
        { label: "greater than or equal", value: "gte" },
        { label: "less than", value: "lt" },
        { label: "less than or equal", value: "lte" },
        { label: "is empty", value: "is_empty" },
      ];
    case "multi_select":
      return [
        { label: "contains any", value: "contains_any" },
        { label: "contains all", value: "contains_all" },
        { label: "contains none", value: "contains_none" },
        { label: "is empty", value: "is_empty" },
      ];
    case "select":
      return [
        { label: "is", value: "eq" },
        { label: "is not", value: "is_not" },
        { label: "is empty", value: "is_empty" },
      ];
    case "text":
      return [
        { label: "contains", value: "contains" },
        { label: "is", value: "eq" },
        { label: "is empty", value: "is_empty" },
        { label: "is not empty", value: "is_not_empty" },
      ];
  }
}

export function getExplorerPropertyFilterFieldType(
  type: WorkspacePropertyDefinition["type"]
): "custom" | "multiselect" | "select" | "text" {
  switch (type) {
    case "checkbox":
      return "custom";
    case "multi_select":
      return "multiselect";
    case "select":
      return "select";
    case "date":
    case "number":
    case "text":
      return "text";
  }
}

export function getExplorerPropertyFilterDefaultOperator(
  type: WorkspacePropertyDefinition["type"]
): PropertyFilterOperator {
  switch (type) {
    case "checkbox":
      return "is_true";
    case "text":
      return "contains";
    case "number":
    case "date":
      return "eq";
    case "multi_select":
      return "contains_any";
    case "select":
      return "eq";
  }
}

export function serializeExplorerPropertyFilters(
  filters: PropertyFilterState[]
): Filter<string>[] {
  return filters.map((filter) => ({
    id: filter.id,
    field: filter.key,
    operator: filter.operator,
    values:
      filter.operator === "is_empty" || filter.operator === "is_not_empty"
        ? []
        : filter.value
          ? filter.type === "multi_select"
            ? filter.value
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean)
            : [filter.value]
          : [],
  }));
}

export function deserializeExplorerPropertyFilters(
  filters: Filter<string>[],
  propertyDefinitionByKey: Map<string, WorkspacePropertyDefinition>
): PropertyFilterState[] {
  return filters.map((filter) => {
    const definition = propertyDefinitionByKey.get(filter.field);
    return {
      id: filter.id,
      key: filter.field,
      operator: filter.operator as PropertyFilterOperator,
      type: definition?.type ?? "text",
      value:
        filter.values.length > 1
          ? filter.values.join(", ")
          : (filter.values[0] ?? ""),
    };
  });
}

export function buildDefaultExplorerCardPropertyKeys(
  availablePropertyDefinitions: WorkspacePropertyDefinition[]
) {
  return availablePropertyDefinitions
    .slice(0, EXPLORER_DEFAULT_VISIBLE_CARD_PROPERTIES)
    .map((definition) => definition.key);
}

export function selectExplorerCardPropertyDefinitions(
  availablePropertyDefinitions: WorkspacePropertyDefinition[],
  cardPropertyKeys: string[]
) {
  const selectedKeys = new Set(cardPropertyKeys);
  return availablePropertyDefinitions
    .filter((definition) => selectedKeys.has(definition.key))
    .slice(0, EXPLORER_MAX_VISIBLE_CARD_PROPERTIES);
}

export function filterExplorerAvailablePropertyDefinitions(
  availablePropertyDefinitions: WorkspacePropertyDefinition[],
  cardFieldQuery: string
) {
  const normalizedQuery = cardFieldQuery.trim().toLowerCase();
  if (!normalizedQuery) {
    return availablePropertyDefinitions;
  }

  return availablePropertyDefinitions.filter((definition) =>
    definition.key.toLowerCase().includes(normalizedQuery)
  );
}

export function toggleExplorerCardPropertyKey(
  current: string[],
  definitionKey: string,
  checked: boolean
) {
  if (checked) {
    if (current.includes(definitionKey)) {
      return current;
    }
    if (current.length >= EXPLORER_MAX_VISIBLE_CARD_PROPERTIES) {
      return current;
    }
    return [...current, definitionKey];
  }

  return current.filter((key) => key !== definitionKey);
}
