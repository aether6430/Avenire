"use client";

import { Calendar } from "@avenire/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@avenire/ui/components/popover";
import {
  CalendarBlank,
  CaretDown,
  CaretRight,
  Copy,
  DotsSixVertical,
  Hash,
  Info,
  Plus,
  Sparkle,
  TextT,
  Trash,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import {
  formatDateValue,
  getOptionColorClass,
  getPropertyTypeItem,
  NUMBER_DISPLAY_ITEMS,
  PROPERTY_TYPE_ITEMS,
  parseLocalDateTimeValue,
  toLocalDateValue,
} from "@/components/editor/properties-table-model";
import { usePropertiesTable } from "@/components/editor/use-properties-table";
import {
  type FrontmatterProperties,
  formatPropertyValue,
  normalizeFrontmatterProperties,
  type WorkspacePropertyDefinition,
} from "@/lib/frontmatter";
import { cn } from "@/lib/utils";

export interface PropertiesTableProps {
  className?: string;
  definitions?: WorkspacePropertyDefinition[];
  disabled?: boolean;
  onChange: (properties: FrontmatterProperties) => void;
  onDefinitionsChange?: (definitions: WorkspacePropertyDefinition[]) => void;
  onSummarizePage?: () => Promise<string | null>;
  properties: FrontmatterProperties;
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
  const {
    collapsed,
    focusNewKeyInput,
    getDefinitionOptions,
    handleAddProperty,
    handleAddPropertyOfType,
    handleAddPropertyOption,
    handleDeleteProperty,
    handleDuplicateProperty,
    handleEntryBlur,
    handleEntryKeyDown,
    handleFormattedPropertyValueChange,
    handleNumberDisplayChange,
    handlePropertyTypeChange,
    handlePropertyValueChange,
    handleRenameProperty,
    isAddingProperty,
    newKey,
    newKeyInputRef,
    newType,
    newValue,
    openPropertyEditorKey,
    optionDraft,
    propertyPickerOpen,
    setCollapsed,
    setIsAddingProperty,
    setNewKey,
    setNewType,
    setNewValue,
    setOpenPropertyEditorKey,
    setOptionDraft,
    setPropertyPickerOpen,
    setTypePickerKey,
    setValueOptionDraft,
    summarizing,
    syncDefinition,
    typePickerKey,
    valueOptionDraft,
  } = usePropertiesTable({
    definitions,
    onChange,
    onDefinitionsChange,
    onSummarizePage,
    properties,
  });

  const renderPropertyValueEditor = (key: string) => {
    const normalizedProperties = normalizeFrontmatterProperties(properties);
    const property = normalizedProperties[key];
    if (!property) {
      return null;
    }

    if (property.type === "checkbox") {
      return (
        <label className="flex min-w-0 flex-1 items-center justify-start gap-2 text-[13px] text-[var(--text-primary)]">
          <input
            checked={property.value}
            className="h-4 w-4 accent-[var(--accent-color,#3b82f6)]"
            disabled={disabled}
            onChange={(event) =>
              handlePropertyValueChange(key, event.currentTarget.checked)
            }
            type="checkbox"
          />
        </label>
      );
    }

    if (property.type === "date") {
      const parsedValue = parseLocalDateTimeValue(property.value);
      const selectedTime = parsedValue?.time ?? "";

      return (
        <Popover>
          <PopoverTrigger
            className="flex min-w-0 flex-1 items-center justify-start gap-1 rounded-md px-1.5 py-1 text-left text-[13px] text-[var(--text-primary)] hover:bg-[var(--background-modifier-hover)]"
            disabled={disabled}
            type="button"
          >
            <span
              className={cn(
                "truncate",
                !property.value && "text-[var(--text-muted)]"
              )}
            >
              {formatDateValue(property.value)}
            </span>
            <CaretDown className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto gap-2 overflow-visible p-2 shadow-none ring-0"
            sideOffset={6}
          >
            <Calendar
              className="p-0"
              mode="single"
              onSelect={(date) => {
                if (!date) {
                  return;
                }
                handlePropertyValueChange(
                  key,
                  toLocalDateValue(date, selectedTime)
                );
              }}
              selected={parsedValue?.date ?? undefined}
            />
            <div className="flex items-center gap-2 border-border/50 border-t pt-2">
              <input
                aria-label={`${key} time`}
                className="h-7 rounded-md border border-transparent bg-transparent px-2 text-[12px]"
                disabled={disabled}
                onChange={(event) => {
                  const nextDate = parsedValue?.date ?? new Date();
                  handlePropertyValueChange(
                    key,
                    toLocalDateValue(nextDate, event.currentTarget.value)
                  );
                }}
                type="time"
                value={selectedTime}
              />
              <button
                className="ml-auto rounded-md px-2 py-1 text-[12px] text-[var(--text-muted)] hover:bg-accent hover:text-accent-foreground"
                disabled={disabled || !property.value}
                onClick={() => handlePropertyValueChange(key, null)}
                type="button"
              >
                Clear
              </button>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    if (property.type === "number") {
      const display = property.display ?? "number";
      const total = property.total && property.total > 0 ? property.total : 100;
      const value = property.value ?? 0;
      const percentage = Math.max(0, Math.min(100, (value / total) * 100));

      return (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            aria-label={`${key} number`}
            className="w-16 shrink-0 bg-transparent text-left text-[13px] text-[var(--text-primary)] leading-[1.15] placeholder:text-[var(--text-muted)] placeholder:opacity-70"
            disabled={disabled}
            inputMode="decimal"
            onChange={(event) =>
              handleFormattedPropertyValueChange(key, event.currentTarget.value)
            }
            placeholder="0"
            type="text"
            value={formatPropertyValue(property)}
          />
          {display === "bar" ? (
            <div className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-full bg-[var(--background-modifier-hover)]">
              <div
                className="h-full rounded-full bg-[var(--accent-color,#3b82f6)]"
                style={{ width: `${percentage}%` }}
              />
            </div>
          ) : null}
          {display === "ring" ? (
            <div
              aria-hidden
              className="h-4 w-4 shrink-0 rounded-full"
              style={{
                background: `conic-gradient(var(--accent-color,#3b82f6) ${percentage}%, var(--background-modifier-hover) 0)`,
              }}
            />
          ) : null}
        </div>
      );
    }

    if (property.type === "select" || property.type === "multi_select") {
      const options = getDefinitionOptions(key, property);
      const selectedValues =
        property.type === "multi_select"
          ? property.value
          : property.value
            ? [property.value]
            : [];
      const displayValue =
        selectedValues.length > 0 ? selectedValues.join(", ") : "Select";

      return (
        <Popover>
          <PopoverTrigger
            className="flex min-w-0 flex-1 items-center justify-start gap-1 rounded-md px-1.5 py-1 text-left text-[13px] text-[var(--text-primary)] hover:bg-[var(--background-modifier-hover)]"
            disabled={disabled}
            type="button"
          >
            {selectedValues.length > 0 ? (
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {selectedValues.map((value) => (
                  <span
                    className={cn(
                      "max-w-36 truncate rounded-[3px] px-1.5 py-0.5 text-[12px] leading-none",
                      getOptionColorClass(value)
                    )}
                    key={value}
                  >
                    {value}
                  </span>
                ))}
              </span>
            ) : (
              <span className="truncate text-[var(--text-muted)]">
                {displayValue}
              </span>
            )}
            <CaretDown className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-56 gap-1 overflow-visible p-1 shadow-none ring-0"
            sideOffset={6}
          >
            <form
              className="flex items-center gap-1 p-1"
              onSubmit={(event) => {
                event.preventDefault();
                const option = valueOptionDraft.trim();
                if (!option) {
                  return;
                }
                syncDefinition(key, property.type, [option]);
                if (property.type === "select") {
                  handlePropertyValueChange(key, option);
                } else if (!property.value.includes(option)) {
                  handlePropertyValueChange(key, [...property.value, option]);
                }
                setValueOptionDraft("");
              }}
            >
              <input
                className="h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-[12px]"
                disabled={disabled}
                onChange={(event) =>
                  setValueOptionDraft(event.currentTarget.value)
                }
                placeholder="Type to create/select"
                spellCheck={false}
                value={valueOptionDraft}
              />
            </form>
            {options.length === 0 ? (
              <div className="px-2 py-2 text-[12px] text-[var(--text-muted)]">
                Type to create the first option.
              </div>
            ) : null}
            {options.map((option) => {
              const selected = selectedValues.includes(option);
              return (
                <button
                  className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                  key={option}
                  onClick={() => {
                    if (property.type === "select") {
                      handlePropertyValueChange(key, selected ? null : option);
                      return;
                    }

                    handlePropertyValueChange(
                      key,
                      selected
                        ? property.value.filter((entry) => entry !== option)
                        : [...property.value, option]
                    );
                  }}
                  type="button"
                >
                  <span
                    className={cn(
                      "max-w-40 truncate rounded-[3px] px-1.5 py-0.5 text-[12px] leading-none",
                      getOptionColorClass(option)
                    )}
                  >
                    {option}
                  </span>
                  {selected ? (
                    <span className="ml-auto text-[11px] text-[var(--text-muted)]">
                      Selected
                    </span>
                  ) : null}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <input
        aria-label={`${key} value`}
        className="min-w-0 flex-1 bg-transparent text-left text-[13px] text-[var(--text-primary)] leading-[1.15] placeholder:text-[var(--text-muted)] placeholder:opacity-70"
        disabled={disabled}
        onBlur={(event) => handleEntryBlur(event, key)}
        onChange={(event) =>
          handleFormattedPropertyValueChange(key, event.currentTarget.value)
        }
        onKeyDown={(event) => handleEntryKeyDown(event, key, "value")}
        placeholder="value"
        spellCheck={false}
        type="text"
        value={formatPropertyValue(property)}
      />
    );
  };

  const entries = Object.entries(normalizeFrontmatterProperties(properties));

  return (
    <div
      className={cn(
        "mx-auto mb-2 max-w-[50rem] overflow-x-hidden border-border/50 border-b px-4 pt-3 pb-2 sm:px-10",
        className
      )}
    >
      <div className="space-y-2">
        {entries.length > 0 ? (
          <button
            className="flex items-center gap-1 text-[13px] text-[var(--text-muted)] leading-[1.15] transition-colors hover:text-[var(--text-primary)]"
            onClick={() => setCollapsed((current) => !current)}
            type="button"
          >
            {collapsed ? (
              <CaretRight className="h-3 w-3" />
            ) : (
              <CaretDown className="h-3 w-3" />
            )}
            {collapsed ? "Show properties" : "Hide properties"}
          </button>
        ) : null}
        <AnimatePresence initial={false}>
          {collapsed
            ? null
            : entries.map(([key, property]) => {
                const definitionOptions = getDefinitionOptions(key, property);
                const propertyTypeItem = getPropertyTypeItem(property.type);
                const PropertyTypeIcon = propertyTypeItem.icon;
                return (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="group flex items-center gap-3 rounded-lg py-1.5 sm:-mx-3 sm:px-3"
                    data-property-row
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    key={key}
                    layout
                    transition={{ duration: 0.16, ease: "easeOut" }}
                  >
                    <Popover
                      onOpenChange={(open) =>
                        setOpenPropertyEditorKey(open ? key : null)
                      }
                      open={openPropertyEditorKey === key}
                    >
                      <PopoverTrigger
                        className="flex w-36 shrink-0 items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] text-[var(--text-muted)] leading-[1.15] transition-colors hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-primary)]"
                        disabled={disabled}
                        onMouseDown={(event) => event.preventDefault()}
                        type="button"
                      >
                        <PropertyTypeIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{key}</span>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="max-h-none w-64 gap-1 overflow-visible p-1 shadow-none ring-0"
                        sideOffset={6}
                      >
                        <div
                          className="px-2 py-1.5"
                          onKeyDown={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <input
                            className="h-7 w-full rounded-md border border-transparent bg-transparent px-2 text-[13px]"
                            defaultValue={key}
                            disabled={disabled}
                            onBlur={(event) =>
                              handleRenameProperty(
                                key,
                                event.currentTarget.value
                              )
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
                        <button
                          className="flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[var(--text-muted)] text-xs hover:bg-accent hover:text-accent-foreground"
                          disabled={disabled}
                          onClick={() =>
                            setTypePickerKey((current) =>
                              current === key ? null : key
                            )
                          }
                          type="button"
                        >
                          <PropertyTypeIcon className="h-3.5 w-3.5" />
                          <span className="text-[var(--text-primary)]">
                            Type
                          </span>
                          <span className="ml-auto">
                            {propertyTypeItem.label}
                          </span>
                          <CaretRight
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              typePickerKey === key && "rotate-90"
                            )}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {typePickerKey === key ? (
                            <motion.div
                              animate={{ height: "auto", opacity: 1 }}
                              className="space-y-1 overflow-hidden px-1"
                              exit={{ height: 0, opacity: 0 }}
                              initial={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.14, ease: "easeOut" }}
                            >
                              {PROPERTY_TYPE_ITEMS.map((item) => {
                                const Icon = item.icon;
                                return (
                                  <button
                                    className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                                    disabled={
                                      disabled || property.type === item.type
                                    }
                                    key={item.type}
                                    onClick={() => {
                                      handlePropertyTypeChange(key, item.type);
                                      setTypePickerKey(null);
                                    }}
                                    type="button"
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                    {item.label}
                                  </button>
                                );
                              })}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                        {property.type === "date" ? (
                          <>
                            <div className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs">
                              <CalendarBlank className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                              Date format
                              <span className="ml-auto text-[var(--text-muted)]">
                                Relative
                              </span>
                            </div>
                            <div className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs">
                              <Info className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                              Time format
                              <span className="ml-auto text-[var(--text-muted)]">
                                24 hour
                              </span>
                            </div>
                          </>
                        ) : null}
                        {property.type === "number" ? (
                          <>
                            <div className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs">
                              <Hash className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                              Number format
                              <span className="ml-auto text-[var(--text-muted)]">
                                Number
                              </span>
                            </div>
                            <div className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs">
                              <Hash className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                              Decimal places
                              <span className="ml-auto text-[var(--text-muted)]">
                                Default
                              </span>
                            </div>
                            <div className="my-1 h-px bg-border/70" />
                            <div className="px-2 pt-1 pb-0.5 text-[11px] text-[var(--text-muted)]">
                              Show as
                            </div>
                            <div className="grid grid-cols-3 gap-1 px-1">
                              {NUMBER_DISPLAY_ITEMS.map((item) => {
                                const selected =
                                  (property.display ?? "number") === item.value;
                                return (
                                  <button
                                    className={cn(
                                      "flex h-11 flex-col items-center justify-center gap-1 rounded-md border border-transparent text-[11px] text-[var(--text-muted)] hover:bg-accent hover:text-accent-foreground",
                                      selected &&
                                        "bg-[var(--background-modifier-hover)] text-[var(--accent-color,#3b82f6)]"
                                    )}
                                    disabled={disabled}
                                    key={item.value}
                                    onClick={() =>
                                      handleNumberDisplayChange(key, {
                                        display: item.value,
                                      })
                                    }
                                    type="button"
                                  >
                                    {item.value === "number" ? (
                                      <span className="font-medium text-[13px]">
                                        42
                                      </span>
                                    ) : null}
                                    {item.value === "bar" ? (
                                      <span className="h-1 w-8 rounded-full bg-[var(--text-muted)]" />
                                    ) : null}
                                    {item.value === "ring" ? (
                                      <span className="h-4 w-4 rounded-full border-2 border-[var(--text-muted)]" />
                                    ) : null}
                                    {item.label}
                                  </button>
                                );
                              })}
                            </div>
                            {property.display === "bar" ||
                            property.display === "ring" ? (
                              <label className="mt-1 flex min-h-7 items-center gap-2 px-2 text-xs">
                                Total
                                <input
                                  className="ml-auto h-7 w-20 rounded-md border border-transparent bg-transparent px-2 text-right"
                                  disabled={disabled}
                                  inputMode="decimal"
                                  onChange={(event) => {
                                    const parsed = Number(
                                      event.currentTarget.value
                                    );
                                    handleNumberDisplayChange(key, {
                                      total: Number.isFinite(parsed)
                                        ? parsed
                                        : null,
                                    });
                                  }}
                                  type="text"
                                  value={property.total ?? ""}
                                />
                              </label>
                            ) : null}
                          </>
                        ) : null}
                        {property.type === "select" ||
                        property.type === "multi_select" ? (
                          <>
                            <div className="my-1 h-px bg-border/70" />
                            <div className="px-2 pt-1 pb-0.5 text-[11px] text-[var(--text-muted)]">
                              Options
                            </div>
                            {definitionOptions.length > 0 ? (
                              <div className="space-y-1 px-1">
                                {definitionOptions.map((option) => (
                                  <div
                                    className="flex min-h-7 items-center gap-2 rounded-md px-1.5 text-[var(--text-primary)] text-xs"
                                    key={option}
                                  >
                                    <DotsSixVertical className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-color,#3b82f6)]" />
                                    <span className="truncate">{option}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            <form
                              className="flex items-center gap-1 px-1 py-1"
                              onSubmit={(event) => {
                                event.preventDefault();
                                handleAddPropertyOption(key);
                              }}
                            >
                              <input
                                className="h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-[12px]"
                                disabled={disabled}
                                onChange={(event) =>
                                  setOptionDraft(event.currentTarget.value)
                                }
                                placeholder="Add an option"
                                spellCheck={false}
                                value={optionDraft}
                              />
                              <button
                                aria-label="Add option"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-accent hover:text-accent-foreground"
                                disabled={
                                  disabled || optionDraft.trim().length === 0
                                }
                                type="submit"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          </>
                        ) : null}
                        <div className="my-1 h-px bg-border/70" />
                        <button
                          className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                          disabled={disabled}
                          onClick={() => handleDuplicateProperty(key)}
                          type="button"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Duplicate property
                        </button>
                        <button
                          className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-destructive text-xs hover:bg-destructive/10"
                          disabled={disabled}
                          onClick={() => handleDeleteProperty(key)}
                          type="button"
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
                      onKeyDown={(event) =>
                        handleEntryKeyDown(event, key, "key")
                      }
                      placeholder="key"
                      spellCheck={false}
                      type="text"
                    />
                    {renderPropertyValueEditor(key)}
                    <button
                      aria-label="Remove property"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--text-icon-muted)] opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover:opacity-100"
                      disabled={disabled}
                      onClick={() => handleDeleteProperty(key)}
                      tabIndex={-1}
                      type="button"
                    >
                      <svg
                        fill="none"
                        height="10"
                        viewBox="0 0 10 10"
                        width="10"
                      >
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
          {isAddingProperty && !collapsed ? (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="group flex items-center gap-3 rounded-lg py-1.5 sm:-mx-3 sm:px-3"
              data-property-row
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              layout
            >
              <input
                className="w-36 shrink-0 bg-transparent text-[13px] text-[var(--text-muted)] leading-[1.15] placeholder:text-[var(--text-muted)] placeholder:opacity-70"
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
                  type="button"
                >
                  {PROPERTY_TYPE_ITEMS.find((item) => item.type === newType)
                    ?.label ?? "Text"}
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-40 gap-1 p-1 shadow-none ring-0"
                  sideOffset={6}
                >
                  {PROPERTY_TYPE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                        key={item.type}
                        onClick={() => setNewType(item.type)}
                        type="button"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
              <input
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-primary)] leading-[1.15] placeholder:text-[var(--text-muted)] placeholder:opacity-70"
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
              className="w-64 gap-1 p-1 shadow-none ring-0"
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
                type="button"
              >
                <TextT className="h-3.5 w-3.5" />
                Custom property
              </button>
              <button
                className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                disabled={summarizing || !onSummarizePage}
                onClick={() => void handleAddPropertyOfType("text", "summary")}
                type="button"
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
                    type="button"
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
