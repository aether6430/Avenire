"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createEmptyProperty,
  type FilePropertyType,
  type FrontmatterProperties,
  formatPropertyValue,
  normalizeFrontmatterProperties,
  normalizePropertyOptions,
  setPropertyValue,
  type WorkspacePropertyDefinition,
} from "@/lib/frontmatter";
import { cn } from "@/lib/utils";

export interface PropertiesTableProps {
  className?: string;
  definitions?: WorkspacePropertyDefinition[];
  disabled?: boolean;
  onChange: (properties: FrontmatterProperties) => void;
  onDefinitionsChange?: (definitions: WorkspacePropertyDefinition[]) => void;
  properties: FrontmatterProperties;
}

function parseFormattedPropertyValue(type: FilePropertyType, value: string) {
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

function normalizeEditablePropertyKey(key: string) {
  return key.trim().toLowerCase();
}

export function PropertiesTable({
  className,
  definitions = [],
  disabled = false,
  onChange,
  onDefinitionsChange,
  properties,
}: PropertiesTableProps) {
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const newKeyInputRef = useRef<HTMLInputElement | null>(null);

  const definitionByKey = useMemo(
    () =>
      new Map(
        definitions.map((definition) => [
          normalizeEditablePropertyKey(definition.key),
          { ...definition, key: normalizeEditablePropertyKey(definition.key) },
        ])
      ),
    [definitions]
  );

  const syncDefinition = useCallback(
    (key: string, type: FilePropertyType, options: string[] = []) => {
      if (!onDefinitionsChange) {
        return;
      }

      const trimmedKey = normalizeEditablePropertyKey(key);
      if (!trimmedKey) {
        return;
      }

      const nextOptions = normalizePropertyOptions(options);
      const nextDefinitions = [...definitions];
      const existingIndex = nextDefinitions.findIndex(
        (definition) =>
          normalizeEditablePropertyKey(definition.key) === trimmedKey
      );

      if (existingIndex >= 0) {
        nextDefinitions[existingIndex] = {
          ...nextDefinitions[existingIndex],
          key: trimmedKey,
          options:
            type === "select" || type === "multi_select"
              ? normalizePropertyOptions([
                  ...nextDefinitions[existingIndex]?.options,
                  ...nextOptions,
                ])
              : [],
          type,
        };
      } else {
        nextDefinitions.push({
          key: trimmedKey,
          options:
            type === "select" || type === "multi_select" ? nextOptions : [],
          type,
        });
      }

      onDefinitionsChange(
        nextDefinitions.sort((left, right) => left.key.localeCompare(right.key))
      );
    },
    [definitions, onDefinitionsChange]
  );

  const handleAddProperty = useCallback(() => {
    const trimmedKey = normalizeEditablePropertyKey(newKey);
    const nextProperties = normalizeFrontmatterProperties(properties);
    if (!(trimmedKey && !nextProperties[trimmedKey])) {
      return;
    }

    const definition = definitionByKey.get(trimmedKey);
    const propertyType = definition?.type ?? "text";
    const nextProperty = createEmptyProperty(propertyType);
    const seededProperty =
      newValue.trim().length > 0
        ? setPropertyValue(nextProperty, newValue)
        : nextProperty;

    onChange(
      normalizeFrontmatterProperties({
        ...nextProperties,
        [trimmedKey]: seededProperty,
      })
    );
    syncDefinition(trimmedKey, propertyType);
    setNewKey("");
    setNewValue("");
    setIsAddingProperty(false);
  }, [definitionByKey, newKey, newValue, onChange, properties, syncDefinition]);

  const handleDeleteProperty = useCallback(
    (key: string) => {
      const normalizedKey = normalizeEditablePropertyKey(key);
      const normalizedProperties = normalizeFrontmatterProperties(properties);
      const { [normalizedKey]: _removed, ...rest } = normalizedProperties;
      onChange(rest);
    },
    [onChange, properties]
  );

  const handleRenameProperty = useCallback(
    (key: string, nextKey: string) => {
      const normalizedKey = normalizeEditablePropertyKey(key);
      const trimmedKey = normalizeEditablePropertyKey(nextKey);
      const normalizedProperties = normalizeFrontmatterProperties(properties);
      if (
        !(
          trimmedKey &&
          trimmedKey !== normalizedKey &&
          !normalizedProperties[trimmedKey]
        )
      ) {
        return;
      }

      const nextEntries = Object.entries(normalizedProperties).map(
        ([entryKey, value]) =>
          entryKey === normalizedKey
            ? ([trimmedKey, value] as const)
            : ([entryKey, value] as const)
      );
      onChange(Object.fromEntries(nextEntries));

      const definition = definitionByKey.get(normalizedKey);
      if (definition && onDefinitionsChange) {
        onDefinitionsChange(
          definitions
            .map((entry) =>
              normalizeEditablePropertyKey(entry.key) === normalizedKey
                ? { ...entry, key: trimmedKey }
                : entry
            )
            .sort((left, right) => left.key.localeCompare(right.key))
        );
      }
    },
    [definitionByKey, definitions, onChange, onDefinitionsChange, properties]
  );

  const handlePropertyValueChange = useCallback(
    (key: string, nextValue: unknown) => {
      const normalizedKey = normalizeEditablePropertyKey(key);
      const normalizedProperties = normalizeFrontmatterProperties(properties);
      const property = normalizedProperties[normalizedKey];
      if (!property) {
        return;
      }

      const nextProperty = setPropertyValue(property, nextValue);
      onChange(
        normalizeFrontmatterProperties({
          ...normalizedProperties,
          [normalizedKey]: nextProperty,
        })
      );

      if (nextProperty.type === "select" && nextProperty.value) {
        syncDefinition(normalizedKey, nextProperty.type, [nextProperty.value]);
      }
      if (nextProperty.type === "multi_select") {
        syncDefinition(normalizedKey, nextProperty.type, nextProperty.value);
      }
    },
    [onChange, properties, syncDefinition]
  );

  const handleFormattedPropertyValueChange = useCallback(
    (key: string, nextValue: string) => {
      const property =
        normalizeFrontmatterProperties(properties)[
          normalizeEditablePropertyKey(key)
        ];
      if (!property) {
        return;
      }

      handlePropertyValueChange(
        key,
        parseFormattedPropertyValue(property.type, nextValue)
      );
    },
    [handlePropertyValueChange, properties]
  );

  const focusNewKeyInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      newKeyInputRef.current?.focus();
    });
  }, []);

  const handleEntryBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>, key: string) => {
      const row = event.currentTarget.closest("[data-property-row]");
      const next = event.relatedTarget as Node | null;
      if (next && row?.contains(next)) {
        return;
      }

      if (key.trim().length === 0) {
        handleDeleteProperty(key);
      }
    },
    [handleDeleteProperty]
  );

  const handleEntryKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLInputElement>,
      key: string,
      field: "key" | "value"
    ) => {
      const property =
        normalizeFrontmatterProperties(properties)[
          normalizeEditablePropertyKey(key)
        ];
      if (!property) {
        return;
      }

      if (event.key === "Enter" && field === "value") {
        event.preventDefault();
        focusNewKeyInput();
        return;
      }

      if (
        event.key === "Backspace" &&
        field === "key" &&
        key.trim().length === 0 &&
        formatPropertyValue(property).trim().length === 0
      ) {
        event.preventDefault();
        handleDeleteProperty(key);
      }
    },
    [focusNewKeyInput, handleDeleteProperty, properties]
  );

  const entries = Object.entries(normalizeFrontmatterProperties(properties));

  return (
    <div
      className={cn(
        "mb-2 overflow-x-hidden border-border/50 border-b px-4 pt-3 pb-2 sm:px-10",
        "mx-auto max-w-[50rem]",
        className
      )}
    >
      <div className="space-y-2">
        {entries.map(([key, property]) => {
          return (
            <div
              className="group -mx-3 flex items-center gap-4 rounded-lg px-3 py-1.5"
              data-property-row
              key={key}
            >
              <input
                className="w-36 shrink-0 bg-transparent text-[13px] text-[var(--text-muted)] leading-[1.15] outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-70"
                defaultValue={key}
                disabled={disabled}
                onBlur={(event) => {
                  handleEntryBlur(event, key);
                  handleRenameProperty(key, event.currentTarget.value);
                }}
                onKeyDown={(event) => handleEntryKeyDown(event, key, "key")}
                placeholder="key"
                spellCheck={false}
                type="text"
              />
              <input
                aria-label={`${key} value`}
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-primary)] leading-[1.15] outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-70"
                disabled={disabled}
                onBlur={(event) => handleEntryBlur(event, key)}
                onChange={(event) =>
                  handleFormattedPropertyValueChange(
                    key,
                    event.currentTarget.value
                  )
                }
                onKeyDown={(event) => handleEntryKeyDown(event, key, "value")}
                placeholder="value"
                spellCheck={false}
                type="text"
                value={formatPropertyValue(property)}
              />
              <button
                aria-label="Remove property"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--text-icon-muted)] opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover:opacity-100"
                disabled={disabled}
                onClick={() => handleDeleteProperty(key)}
                tabIndex={-1}
                type="button"
              >
                <svg fill="none" height="10" viewBox="0 0 10 10" width="10">
                  <path
                    d="M2 2l6 6M8 2l-6 6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </div>
          );
        })}

        {isAddingProperty ? (
          <div
            className="group -mx-3 flex items-center gap-4 rounded-lg px-3 py-1.5"
            data-property-row
          >
            <input
              className="w-36 shrink-0 bg-transparent text-[13px] text-[var(--text-muted)] leading-[1.15] outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-70"
              disabled={disabled}
              onChange={(event) => setNewKey(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddProperty();
                }
              }}
              placeholder="key"
              ref={newKeyInputRef}
              spellCheck={false}
              type="text"
              value={newKey}
            />
            <input
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-primary)] leading-[1.15] outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-70"
              disabled={disabled}
              onChange={(event) => setNewValue(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddProperty();
                }
              }}
              placeholder="value"
              spellCheck={false}
              type="text"
              value={newValue}
            />
            <button
              aria-label="Remove property"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--text-icon-muted)] opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover:opacity-100"
              disabled={disabled}
              onClick={() => {
                setNewKey("");
                setNewValue("");
                setIsAddingProperty(false);
              }}
              tabIndex={-1}
              type="button"
            >
              <svg fill="none" height="10" viewBox="0 0 10 10" width="10">
                <path
                  d="M2 2l6 6M8 2l-6 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-4 pt-1">
          <button
            className="flex items-center gap-1 text-[13px] text-[var(--text-muted)] leading-[1.15] transition-colors hover:text-[var(--text-primary)]"
            disabled={disabled}
            onClick={() => {
              setIsAddingProperty(true);
              focusNewKeyInput();
            }}
            type="button"
          >
            <svg fill="none" height="12" viewBox="0 0 12 12" width="12">
              <path
                d="M6 2v8M2 6h8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              />
            </svg>
            Add property
          </button>
        </div>
      </div>
    </div>
  );
}
