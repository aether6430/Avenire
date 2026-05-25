import {
  getFileProperties,
  type PropertyFilterState,
} from "@/components/files/explorer/explorer-file-properties-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import { formatPropertyValue } from "@/lib/frontmatter";

export type ExplorerEntry =
  | { folder: FolderRecord; id: string; kind: "folder" }
  | { file: FileRecord; id: string; kind: "file" };

export type SortState =
  | {
      direction: "asc" | "desc";
      key: "createdAt" | "name" | "updatedAt";
      kind: "builtin";
    }
  | {
      direction: "asc" | "desc";
      key: string;
      kind: "property";
      type: WorkspacePropertyDefinition["type"];
    };

interface BuildWorkspaceFolderBrowseModelInput {
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  files: FileRecord[];
  folders: FolderRecord[];
  propertyFilters: PropertyFilterState[];
  query: string;
  sortState: SortState;
  vectorFilteredIds: Set<string> | null;
}

function matchesFilePropertyFilter(
  file: FileRecord,
  filter: PropertyFilterState
) {
  const property = getFileProperties(file)[filter.key];
  if (!property) {
    return filter.operator === "is_empty";
  }

  const needle = filter.value.trim().toLowerCase();
  switch (property.type) {
    case "checkbox":
      return filter.operator === "is_true" ? property.value : !property.value;
    case "date":
    case "text":
    case "select": {
      const value = String(property.value ?? "").toLowerCase();
      switch (filter.operator) {
        case "contains":
          return value.includes(needle);
        case "eq":
          return value === needle;
        case "gt":
          return value > needle;
        case "gte":
          return value >= needle;
        case "is_empty":
          return value.length === 0;
        case "is_not":
          return value !== needle;
        case "is_not_empty":
          return value.length > 0;
        case "lt":
          return value < needle;
        case "lte":
          return value <= needle;
        default:
          return true;
      }
    }
    case "number": {
      const value = property.value;
      const operand = Number(filter.value);
      if (filter.operator === "is_empty") {
        return value === null;
      }
      if (value === null || !Number.isFinite(operand)) {
        return false;
      }
      switch (filter.operator) {
        case "eq":
          return value === operand;
        case "gt":
          return value > operand;
        case "gte":
          return value >= operand;
        case "lt":
          return value < operand;
        case "lte":
          return value <= operand;
        default:
          return false;
      }
    }
    case "multi_select": {
      const values = property.value.map((entry) => entry.toLowerCase());
      const needles = filter.value
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
      switch (filter.operator) {
        case "contains_any":
          return needles.some((entry) => values.includes(entry));
        case "contains_all":
          return needles.every((entry) => values.includes(entry));
        case "contains_none":
          return needles.every((entry) => !values.includes(entry));
        case "is_empty":
          return values.length === 0;
        default:
          return true;
      }
    }
  }
}

function compareFolders(
  left: FolderRecord,
  right: FolderRecord,
  sortState: SortState
) {
  if (sortState.kind === "builtin" && sortState.key === "name") {
    return left.name.localeCompare(right.name);
  }

  const leftDate = new Date(
    sortState.kind === "builtin" && sortState.key === "updatedAt"
      ? (left.updatedAt ?? left.createdAt ?? 0)
      : (left.createdAt ?? 0)
  ).getTime();
  const rightDate = new Date(
    sortState.kind === "builtin" && sortState.key === "updatedAt"
      ? (right.updatedAt ?? right.createdAt ?? 0)
      : (right.createdAt ?? 0)
  ).getTime();

  return sortState.direction === "asc"
    ? leftDate - rightDate
    : rightDate - leftDate;
}

function compareFiles(
  left: FileRecord,
  right: FileRecord,
  sortState: SortState
) {
  if (sortState.kind === "builtin") {
    if (sortState.key === "name") {
      return sortState.direction === "asc"
        ? left.name.localeCompare(right.name)
        : right.name.localeCompare(left.name);
    }

    const leftDate = new Date(
      sortState.key === "updatedAt"
        ? (left.updatedAt ?? left.createdAt)
        : left.createdAt
    ).getTime();
    const rightDate = new Date(
      sortState.key === "updatedAt"
        ? (right.updatedAt ?? right.createdAt)
        : right.createdAt
    ).getTime();

    return sortState.direction === "asc"
      ? leftDate - rightDate
      : rightDate - leftDate;
  }

  const leftProperty = getFileProperties(left)[sortState.key];
  const rightProperty = getFileProperties(right)[sortState.key];
  if (!(leftProperty || rightProperty)) {
    return left.name.localeCompare(right.name);
  }
  if (!leftProperty) {
    return 1;
  }
  if (!rightProperty) {
    return -1;
  }

  const leftValue = formatPropertyValue(leftProperty).toLowerCase();
  const rightValue = formatPropertyValue(rightProperty).toLowerCase();
  const compare =
    leftProperty.type === "number" && rightProperty.type === "number"
      ? (leftProperty.value ?? Number.POSITIVE_INFINITY) -
        (rightProperty.value ?? Number.POSITIVE_INFINITY)
      : leftValue.localeCompare(rightValue);

  if (compare === 0) {
    return left.name.localeCompare(right.name);
  }

  return sortState.direction === "asc" ? compare : compare * -1;
}

export function buildWorkspaceFolderBrowseModel({
  allFiles,
  allFolders,
  files,
  folders,
  propertyFilters,
  query,
  sortState,
  vectorFilteredIds,
}: BuildWorkspaceFolderBrowseModelInput) {
  const term = query.trim().toLowerCase();
  const activeVectorIds = vectorFilteredIds;

  const filteredFolders = activeVectorIds
    ? allFolders.filter((folder) => activeVectorIds.has(folder.id))
    : term
      ? folders.filter((folder) => folder.name.toLowerCase().includes(term))
      : folders;

  const candidateFiles = activeVectorIds
    ? allFiles.filter((file) => activeVectorIds.has(file.id))
    : term
      ? files.filter((file) => file.name.toLowerCase().includes(term))
      : files;

  const filteredFiles =
    propertyFilters.length === 0
      ? candidateFiles
      : candidateFiles.filter((file) =>
          propertyFilters.every((filter) =>
            matchesFilePropertyFilter(file, filter)
          )
        );

  const sortedFolders = [...filteredFolders].sort((left, right) =>
    compareFolders(left, right, sortState)
  );
  const sortedFiles = [...filteredFiles].sort((left, right) =>
    compareFiles(left, right, sortState)
  );
  const visibleItemIds = [
    ...sortedFolders.map((folder) => folder.id),
    ...sortedFiles.map((file) => file.id),
  ];
  const explorerEntries: ExplorerEntry[] = [
    ...sortedFolders.map((folder) => ({
      folder,
      id: folder.id,
      kind: "folder" as const,
    })),
    ...sortedFiles.map((file) => ({
      file,
      id: file.id,
      kind: "file" as const,
    })),
  ];

  return {
    explorerEntries,
    filteredFiles,
    filteredFolders,
    sortedFiles,
    sortedFolders,
    visibleItemIds,
  };
}
