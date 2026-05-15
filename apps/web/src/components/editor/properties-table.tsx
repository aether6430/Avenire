"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@avenire/ui/components/popover";
import {
  CalendarBlank,
  CheckSquare,
  Hash,
  ListBullets,
  PencilSimple,
  Plus,
  Sparkle,
  TextT,
  Trash,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
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

interface PropertiesTableProps {
  className?: string;
  definitions?: WorkspacePropertyDefinition[];
  disabled?: boolean;
  onChange: (properties: FrontmatterProperties) => void;
  onDefinitionsChange?: (definitions: WorkspacePropertyDefinition[]) => void;
  onSummarizePage?: () => Promise<string | null>;
  properties: FrontmatterProperties;
}

const PROPERTY_TYPE_ITEMS: Array<{
  label: string;
  type: FilePropertyType;
  icon: typeof TextT;
}> = [
  { label: "Text", type: "text", icon: TextT },
  { label: "Number", type: "number", icon: Hash },
  { label: "Select", type: "select", icon: CheckSquare },
  { label: "Multi-select", type: "multi_select", icon: ListBullets },
  { label: "Date", type: "date", icon: CalendarBlank },
  { label: "Checkbox", type: "checkbox", icon: CheckSquare },
];

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
  onSummarizePage,
  properties,
}: PropertiesTableProps) {
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<FilePropertyType>("text");
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
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
    const propertyType = definition?.type ?? newType;
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
    setNewType("text");
    setIsAddingProperty(false);
  }, [
    definitionByKey,
    newKey,
    newType,
    newValue,
    onChange,
    properties,
    syncDefinition,
  ]);

  const handleAddPropertyOfType = useCallback(
    async (type: FilePropertyType, keyHint?: string) => {
      const normalizedProperties = normalizeFrontmatterProperties(properties);
      let key = normalizeEditablePropertyKey(keyHint ?? type);
      if (key === "multi_select") {
        key = "multi-select";
      }
      let counter = 2;
      const baseKey = key;
      while (normalizedProperties[key]) {
        key = `${baseKey} ${counter}`;
        counter += 1;
      }

      let nextProperty = createEmptyProperty(type);
      if (keyHint === "summary" && onSummarizePage) {
        setSummarizing(true);
        const summary = await onSummarizePage().finally(() =>
          setSummarizing(false)
        );
        if (!summary) {
          return;
        }
        key = normalizedProperties.summary ? `summary ${counter}` : "summary";
        nextProperty = setPropertyValue(nextProperty, summary);
      }

      onChange(
        normalizeFrontmatterProperties({
          ...normalizedProperties,
          [key]: nextProperty,
        })
      );
      syncDefinition(key, type);
      setIsAddingProperty(false);
      setPropertyPickerOpen(false);
      setNewType("text");
    },
    [onChange, onSummarizePage, properties, syncDefinition]
  );

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
        <AnimatePresence initial={false}>
          {entries.map(([key, property]) => {
            const propertyTypeLabel =
              PROPERTY_TYPE_ITEMS.find((item) => item.type === property.type)
                ?.label ?? "Text";
            return (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="group -mx-3 flex items-center gap-3 rounded-lg px-3 py-1.5"
                data-property-row
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                key={key}
                layout
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <Popover>
                  <PopoverTrigger
                    className="flex w-36 shrink-0 items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] text-[var(--text-muted)] leading-[1.15] outline-none transition-colors hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-primary)]"
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <PencilSimple className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{key}</span>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-64 gap-1 p-1"
                    sideOffset={6}
                  >
                    <div
                      className="px-2 py-1.5"
                      onKeyDown={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <input
                        className="h-7 w-full rounded-md border border-border/70 bg-transparent px-2 text-[13px] outline-none focus:border-[var(--accent-color,#3b82f6)]"
                        defaultValue={key}
                        disabled={disabled}
                        onBlur={(event) =>
                          handleRenameProperty(key, event.currentTarget.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                        }}
                        placeholder="Property name"
                        spellCheck={false}
                      />
                    </div>
                    <div className="px-2 pt-1 pb-0.5 text-[11px] text-[var(--text-muted)]">
                      Type
                    </div>
                    {PROPERTY_TYPE_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                          disabled={disabled}
                          key={item.type}
                          onClick={() => {
                            const normalizedProperties =
                              normalizeFrontmatterProperties(properties);
                            onChange({
                              ...normalizedProperties,
                              [key]: createEmptyProperty(item.type),
                            });
                            syncDefinition(key, item.type);
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                          {property.type === item.type ? (
                            <span className="ml-auto text-[11px] text-[var(--text-muted)]">
                              Current
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                    <div className="my-1 h-px bg-border/70" />
                    <button
                      className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-destructive text-xs hover:bg-destructive/10"
                      disabled={disabled}
                      onClick={() => handleDeleteProperty(key)}
                    >
                      <Trash className="h-3.5 w-3.5" />
                      Delete property
                    </button>
                  </PopoverContent>
                </Popover>
                <input
                  className="sr-only"
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
                <span className="hidden w-24 shrink-0 text-[12px] text-[var(--text-muted)] sm:block">
                  {propertyTypeLabel}
                </span>
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
              </motion.div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {isAddingProperty ? (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              className="group -mx-3 flex items-center gap-3 rounded-lg px-3 py-1.5"
              data-property-row
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
              layout
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
              <Popover>
                <PopoverTrigger
                  className="hidden w-24 shrink-0 rounded-md px-1.5 py-1 text-left text-[12px] text-[var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-primary)] sm:block"
                  disabled={disabled}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {PROPERTY_TYPE_ITEMS.find((item) => item.type === newType)
                    ?.label ?? "Text"}
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-40 gap-1 p-1"
                  sideOffset={6}
                >
                  {PROPERTY_TYPE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                        key={item.type}
                        onClick={() => setNewType(item.type)}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
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
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex items-center gap-4 pt-1">
          <Popover
            onOpenChange={setPropertyPickerOpen}
            open={propertyPickerOpen}
          >
            <PopoverTrigger
              className="flex items-center gap-1 text-[13px] text-[var(--text-muted)] leading-[1.15] transition-colors hover:text-[var(--text-primary)]"
              disabled={disabled}
              type="button"
            >
              <Plus className="h-3 w-3" />
              Add property
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-64 gap-1 p-1"
              sideOffset={6}
            >
              <button
                className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                disabled={disabled}
                onClick={() => {
                  setPropertyPickerOpen(false);
                  setIsAddingProperty(true);
                  focusNewKeyInput();
                }}
              >
                <PencilSimple className="h-3.5 w-3.5" />
                Custom property
              </button>
              <button
                className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                disabled={summarizing || !onSummarizePage}
                onClick={() => void handleAddPropertyOfType("text", "summary")}
              >
                <Sparkle className="h-3.5 w-3.5 text-[var(--accent-color,#3b82f6)]" />
                {summarizing ? "Summarizing..." : "Summarize"}
              </button>
              <div className="my-1 h-px bg-border/70" />
              <div className="px-2 pt-1 pb-0.5 text-[11px] text-[var(--text-muted)]">
                Type
              </div>
              {PROPERTY_TYPE_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                    key={item.type}
                    onClick={() => void handleAddPropertyOfType(item.type)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
