import {
  CalendarBlank,
  CheckSquare,
  Hash,
  ListBullets,
  TextT,
} from "@phosphor-icons/react";
import {
  createEmptyProperty,
  type FilePropertyType,
  type FilePropertyValue,
  formatPropertyValue,
  type NumberPropertyDisplay,
  setPropertyValue,
} from "@/lib/frontmatter";

export const PROPERTY_TYPE_ITEMS: Array<{
  icon: typeof TextT;
  label: string;
  type: FilePropertyType;
}> = [
  { icon: TextT, label: "Text", type: "text" },
  { icon: Hash, label: "Number", type: "number" },
  { icon: CheckSquare, label: "Select", type: "select" },
  { icon: ListBullets, label: "Multi-select", type: "multi_select" },
  { icon: CalendarBlank, label: "Date", type: "date" },
  { icon: CheckSquare, label: "Checkbox", type: "checkbox" },
];

export const NUMBER_DISPLAY_ITEMS: Array<{
  label: string;
  value: NumberPropertyDisplay;
}> = [
  { label: "Number", value: "number" },
  { label: "Bar", value: "bar" },
  { label: "Ring", value: "ring" },
];

const OPTION_COLOR_CLASSES = [
  "bg-[#6f5878] text-white",
  "bg-[#5f5f64] text-white",
  "bg-[#795b29] text-white",
  "bg-[#8a4f45] text-white",
  "bg-[#3f6b55] text-white",
  "bg-[#4b6380] text-white",
];

export function getOptionColorClass(option: string) {
  const index =
    Array.from(option).reduce((total, char) => total + char.charCodeAt(0), 0) %
    OPTION_COLOR_CLASSES.length;
  return OPTION_COLOR_CLASSES[index];
}

export function parseFormattedPropertyValue(
  type: FilePropertyType,
  value: string
) {
  if (type === "checkbox") {
    return value.trim().toLowerCase() === "true";
  }

  if (type === "number") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (type === "multi_select") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return value;
}

export function normalizeEditablePropertyKey(key: string) {
  return key.trim().toLowerCase();
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function parseLocalDateTimeValue(value: string | null) {
  if (!value) {
    return null;
  }

  const [datePart, timePart] = value.split("T");
  const dateSegments = datePart?.split("-").map((segment) => Number(segment));
  if (
    !dateSegments ||
    dateSegments.length !== 3 ||
    dateSegments.some((segment) => Number.isNaN(segment))
  ) {
    return null;
  }

  const [year, month, day] = dateSegments;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date,
    time:
      typeof timePart === "string" && /^\d{2}:\d{2}/.test(timePart)
        ? timePart.slice(0, 5)
        : "",
  };
}

export function toLocalDateValue(date: Date, time: string) {
  const datePart = `${date.getFullYear()}-${padDatePart(
    date.getMonth() + 1
  )}-${padDatePart(date.getDate())}`;
  return time ? `${datePart}T${time}` : datePart;
}

export function formatDateValue(value: string | null) {
  const parsed = parseLocalDateTimeValue(value);
  if (!parsed) {
    return "Select";
  }

  const dateLabel = parsed.date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return parsed.time ? `${dateLabel} ${parsed.time}` : dateLabel;
}

export function getPropertyTypeItem(type: FilePropertyType) {
  return (
    PROPERTY_TYPE_ITEMS.find((item) => item.type === type) ??
    PROPERTY_TYPE_ITEMS[0]
  );
}

export function convertPropertyType(
  property: FilePropertyValue,
  type: FilePropertyType
): FilePropertyValue {
  if (property.type === type) {
    return property;
  }

  return setPropertyValue(
    createEmptyProperty(type),
    formatPropertyValue(property)
  );
}

export function shouldAutoCommitDraftProperty(input: {
  disabled: boolean;
  isAddingProperty: boolean;
  key: string;
  value: string;
}) {
  return (
    !input.disabled &&
    input.isAddingProperty &&
    normalizeEditablePropertyKey(input.key).length > 0 &&
    input.value.trim().length > 0
  );
}
