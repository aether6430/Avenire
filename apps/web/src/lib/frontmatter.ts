export type FilePropertyType =
  | "checkbox"
  | "date"
  | "multi_select"
  | "number"
  | "select"
  | "text";

interface BaseFileProperty<T extends FilePropertyType, TValue> {
  type: T;
  value: TValue;
}

export type FilePropertyValue =
  | BaseFileProperty<"checkbox", boolean>
  | BaseFileProperty<"date", string | null>
  | BaseFileProperty<"multi_select", string[]>
  | BaseFileProperty<"number", number | null>
  | BaseFileProperty<"select", string | null>
  | BaseFileProperty<"text", string | null>;

export interface FrontmatterProperties {
  [key: string]: FilePropertyValue;
}

export interface PageMetadataState {
  bannerUrl: string | null;
  icon: string | null;
  properties: FrontmatterProperties;
}

export interface WorkspacePropertyDefinition {
  createdAt?: string;
  id?: string;
  key: string;
  lastUsedAt?: string;
  options: string[];
  type: FilePropertyType;
  updatedAt?: string;
  workspaceId?: string;
}

export const EMPTY_PAGE_METADATA_STATE: PageMetadataState = {
  bannerUrl: null,
  icon: null,
  properties: {},
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizePropertyKey(key: string) {
  return key.trim();
}

export function isFilePropertyType(value: unknown): value is FilePropertyType {
  return (
    value === "checkbox" ||
    value === "date" ||
    value === "multi_select" ||
    value === "number" ||
    value === "select" ||
    value === "text"
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

export function normalizePropertyValue(value: unknown): FilePropertyValue | null {
  const record = asRecord(value);
  if (!record || !isFilePropertyType(record.type)) {
    return null;
  }

  switch (record.type) {
    case "checkbox":
      return { type: "checkbox", value: record.value === true };
    case "date":
      return { type: "date", value: normalizeString(record.value) };
    case "multi_select":
      return { type: "multi_select", value: normalizeStringArray(record.value) };
    case "number":
      return { type: "number", value: normalizeNumber(record.value) };
    case "select":
      return { type: "select", value: normalizeString(record.value) };
    case "text":
      return { type: "text", value: normalizeString(record.value) };
  }
}

export function normalizeFrontmatterProperties(
  value: unknown
): FrontmatterProperties {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  const entries = Object.entries(record)
    .map(([key, property]) => {
      const normalizedKey = normalizePropertyKey(key);
      const normalizedProperty = normalizePropertyValue(property);
      if (!(normalizedKey && normalizedProperty)) {
        return null;
      }

      return [normalizedKey, normalizedProperty] as const;
    })
    .filter(
      (entry): entry is readonly [string, FilePropertyValue] => Boolean(entry)
    );

  return Object.fromEntries(entries);
}

export function normalizePropertyDefinition(
  value: unknown
): WorkspacePropertyDefinition | null {
  const record = asRecord(value);
  const key = normalizeString(record?.key);
  const type = record?.type;
  if (!(key && isFilePropertyType(type))) {
    return null;
  }

  return {
    createdAt: normalizeString(record?.createdAt) ?? undefined,
    id: normalizeString(record?.id) ?? undefined,
    key,
    lastUsedAt: normalizeString(record?.lastUsedAt) ?? undefined,
    options: normalizeStringArray(record?.options),
    type,
    updatedAt: normalizeString(record?.updatedAt) ?? undefined,
    workspaceId: normalizeString(record?.workspaceId) ?? undefined,
  };
}

export function normalizePropertyDefinitions(
  value: unknown
): WorkspacePropertyDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizePropertyDefinition(entry))
    .filter(
      (entry): entry is WorkspacePropertyDefinition => Boolean(entry)
    )
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function normalizePageMetadataState(value: unknown): PageMetadataState {
  const record = asRecord(value);
  if (!record) {
    return EMPTY_PAGE_METADATA_STATE;
  }

  return {
    bannerUrl: normalizeString(record.bannerUrl),
    icon: normalizeString(record.icon),
    properties: normalizeFrontmatterProperties(record.properties),
  };
}

export function createEmptyProperty(type: FilePropertyType): FilePropertyValue {
  switch (type) {
    case "checkbox":
      return { type: "checkbox", value: false };
    case "date":
      return { type: "date", value: null };
    case "multi_select":
      return { type: "multi_select", value: [] };
    case "number":
      return { type: "number", value: null };
    case "select":
      return { type: "select", value: null };
    case "text":
      return { type: "text", value: null };
  }
}

export function setPropertyValue(
  property: FilePropertyValue,
  value: unknown
): FilePropertyValue {
  switch (property.type) {
    case "checkbox":
      return { type: "checkbox", value: value === true };
    case "date":
      return { type: "date", value: normalizeString(value) };
    case "multi_select":
      return {
        type: "multi_select",
        value: Array.isArray(value)
          ? normalizeStringArray(value)
          : normalizeStringArray(String(value ?? "").split(",")),
      };
    case "number":
      return {
        type: "number",
        value:
          typeof value === "string" && value.trim().length > 0
            ? normalizeNumber(Number(value))
            : normalizeNumber(value),
      };
    case "select":
      return { type: "select", value: normalizeString(value) };
    case "text":
      return { type: "text", value: normalizeString(value) };
  }
}

export function formatPropertyValue(property: FilePropertyValue): string {
  switch (property.type) {
    case "checkbox":
      return property.value ? "true" : "false";
    case "date":
    case "select":
    case "text":
      return property.value ?? "";
    case "multi_select":
      return property.value.join(", ");
    case "number":
      return property.value === null ? "" : String(property.value);
  }
}

export function normalizePropertyOptions(options: string[]) {
  return Array.from(
    new Set(options.map((option) => option.trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));
}

export function areFrontmatterPropertiesEqual(
  left: FrontmatterProperties,
  right: FrontmatterProperties
) {
  return (
    JSON.stringify(normalizeFrontmatterProperties(left)) ===
    JSON.stringify(normalizeFrontmatterProperties(right))
  );
}

export function arePageMetadataStatesEqual(
  left: PageMetadataState,
  right: PageMetadataState
) {
  return (
    left.bannerUrl === right.bannerUrl &&
    left.icon === right.icon &&
    areFrontmatterPropertiesEqual(left.properties, right.properties)
  );
}

export const PROPERTY_TYPE_LABELS: Record<FilePropertyType, string> = {
  checkbox: "Checkbox",
  date: "Date",
  multi_select: "Multi-select",
  number: "Number",
  select: "Select",
  text: "Text",
};
