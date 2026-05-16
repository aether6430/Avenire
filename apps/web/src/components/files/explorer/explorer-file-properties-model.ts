import type { FileRecord } from "@/components/files/explorer/shared";
import type {
  FilePropertyValue,
  FrontmatterProperties,
  WorkspacePropertyDefinition,
} from "@/lib/frontmatter";
import { formatPropertyValue } from "@/lib/frontmatter";

export type PropertyFilterOperator =
  | "contains"
  | "contains_all"
  | "contains_any"
  | "contains_none"
  | "eq"
  | "gt"
  | "gte"
  | "is_empty"
  | "is_false"
  | "is_not"
  | "is_not_empty"
  | "is_true"
  | "lt"
  | "lte";

export interface PropertyFilterState {
  id: string;
  key: string;
  operator: PropertyFilterOperator;
  type: WorkspacePropertyDefinition["type"];
  value: string;
}

export function getFileProperties(file: FileRecord): FrontmatterProperties {
  return file.page?.properties ?? {};
}

export function formatCardPropertyValue(property: FilePropertyValue) {
  if (property.type === "checkbox") {
    return property.value ? "Yes" : "No";
  }

  return formatPropertyValue(property);
}
