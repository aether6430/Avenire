"use client";

import { useRender } from "@base-ui/react/use-render";
import {
  Warning as AlertCircleIcon,
  CheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import { cva } from "class-variance-authority";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { ButtonGroup, ButtonGroupText } from "./button-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Input } from "./input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "./input-group";
import { Kbd } from "./kbd";
import { ScrollArea } from "./scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export interface FilterI18nConfig {
  addFilter: string;
  addFilterTitle: string;
  defaultColor: string;
  defaultCurrency: string;
  false: string;

  helpers: {
    formatOperator: (operator: string) => string;
  };
  max: string;
  min: string;
  noFieldsFound: string;
  noResultsFound: string;

  operators: {
    is: string;
    isNot: string;
    isAnyOf: string;
    isNotAnyOf: string;
    includesAll: string;
    excludesAll: string;
    before: string;
    after: string;
    between: string;
    notBetween: string;
    contains: string;
    notContains: string;
    startsWith: string;
    endsWith: string;
    isExactly: string;
    equals: string;
    notEquals: string;
    greaterThan: string;
    lessThan: string;
    overlaps: string;
    includes: string;
    excludes: string;
    includesAllOf: string;
    includesAnyOf: string;
    empty: string;
    notEmpty: string;
  };
  percent: string;

  placeholders: {
    enterField: (fieldType: string) => string;
    selectField: string;
    searchField: (fieldName: string) => string;
    enterKey: string;
    enterValue: string;
  };
  searchFields: string;
  select: string;
  selected: string;
  selectedCount: string;
  to: string;
  true: string;
  typeAndPressEnter: string;

  validation: {
    invalidEmail: string;
    invalidUrl: string;
    invalidTel: string;
    invalid: string;
  };
}

export const DEFAULT_I18N: FilterI18nConfig = {
  addFilter: "Filter",
  searchFields: "Filter...",
  noFieldsFound: "No filters found.",
  noResultsFound: "No results found.",
  select: "Select...",
  true: "True",
  false: "False",
  min: "Min",
  max: "Max",
  to: "to",
  typeAndPressEnter: "Type and press Enter to add tag",
  selected: "selected",
  selectedCount: "selected",
  percent: "%",
  defaultCurrency: "$",
  defaultColor: "#000000",
  addFilterTitle: "Add filter",

  operators: {
    is: "is",
    isNot: "is not",
    isAnyOf: "is any of",
    isNotAnyOf: "is not any of",
    includesAll: "includes all",
    excludesAll: "excludes all",
    before: "before",
    after: "after",
    between: "between",
    notBetween: "not between",
    contains: "contains",
    notContains: "does not contain",
    startsWith: "starts with",
    endsWith: "ends with",
    isExactly: "is exactly",
    equals: "equals",
    notEquals: "not equals",
    greaterThan: "greater than",
    lessThan: "less than",
    overlaps: "overlaps",
    includes: "includes",
    excludes: "excludes",
    includesAllOf: "includes all of",
    includesAnyOf: "includes any of",
    empty: "is empty",
    notEmpty: "is not empty",
  },

  placeholders: {
    enterField: (fieldType: string) => `Enter ${fieldType}...`,
    selectField: "Select...",
    searchField: (fieldName: string) => `Search ${fieldName.toLowerCase()}...`,
    enterKey: "Enter key...",
    enterValue: "Enter value...",
  },

  helpers: {
    formatOperator: (operator: string) => operator.replace(/_/g, " "),
  },

  validation: {
    invalidEmail: "Invalid email format",
    invalidUrl: "Invalid URL format",
    invalidTel: "Invalid phone format",
    invalid: "Invalid input format",
  },
};

interface FilterContextValue {
  allowMultiple?: boolean;
  className?: string;
  i18n: FilterI18nConfig;
  radius: "default" | "full";
  showSearchInput?: boolean;
  size: "sm" | "default" | "lg";
  trigger?: React.ReactNode;
  variant: "solid" | "default";
}

const FilterContext = createContext<FilterContextValue>({
  variant: "default",
  size: "default",
  radius: "default",
  i18n: DEFAULT_I18N,
  className: undefined,
  showSearchInput: true,
  trigger: undefined,
  allowMultiple: true,
});

const useFilterContext = () => useContext(FilterContext);

const filtersContainerVariants = cva("flex flex-wrap items-center", {
  variants: {
    variant: {
      solid: "gap-2",
      default: "",
    },
    size: {
      sm: "gap-1.5",
      default: "gap-2.5",
      lg: "gap-3.5",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

function FilterInput<T = unknown>({
  field,
  onBlur,
  onKeyDown,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  field?: FilterFieldConfig<T>;
}) {
  const context = useFilterContext();
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [props.autoFocus]);

  const validateInput = (value: string, pattern?: string): boolean => {
    if (!(pattern && value)) {
      return true;
    }
    const regex = new RegExp(pattern);
    return regex.test(value);
  };

  const getValidationMessage = (): string => {
    return context.i18n.validation.invalid;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const pattern = field?.pattern || props.pattern;

    if (value && (pattern || field?.validation)) {
      let valid = true;
      let customMessage = "";

      if (field?.validation) {
        const result = field.validation(value);
        if (typeof result === "boolean") {
          valid = result;
        } else {
          valid = result.valid;
          customMessage = result.message || "";
        }
      } else if (pattern) {
        valid = validateInput(value, pattern);
      }

      setIsValid(valid);
      setValidationMessage(
        valid ? "" : customMessage || getValidationMessage()
      );
    } else {
      setIsValid(true);
      setValidationMessage("");
    }

    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      !(
        isValid ||
        [
          "Tab",
          "Escape",
          "Enter",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.key)
      )
    ) {
      setIsValid(true);
      setValidationMessage("");
    }

    onKeyDown?.(e);
  };

  return (
    <InputGroup
      className={cn(
        "w-36",
        context.size === "sm" && "h-7!",
        context.size === "default" && "h-8!",
        context.size === "lg" && "h-9!",
        className
      )}
    >
      {field?.prefix && (
        <InputGroupAddon>
          <InputGroupText>{field.prefix}</InputGroupText>
        </InputGroupAddon>
      )}
      <InputGroupInput
        aria-describedby={
          !isValid && validationMessage
            ? `${field?.key || "input"}-error`
            : undefined
        }
        aria-invalid={!isValid}
        className={cn(
          context.size === "sm" && "h-7! text-xs",
          context.size === "default" && "h-8!",
          context.size === "lg" && "h-9!"
        )}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        {...props}
      />
      {!isValid && validationMessage && (
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger render={<InputGroupButton size="icon-xs" />}>
              <AlertCircleIcon className="size-3.5 text-destructive" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{validationMessage}</p>
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      )}

      {field?.suffix && (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{field.suffix}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

interface FilterRemoveButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

function FilterRemoveButton({
  className,
  icon = <XIcon />,
  ...props
}: FilterRemoveButtonProps) {
  const context = useFilterContext();

  const sizeMap = {
    sm: "sm" as const,
    default: "sm" as const,
    lg: "default" as const,
  };

  return (
    <Button
      size={
        context.size === "sm"
          ? "icon-sm"
          : context.size === "lg"
            ? "icon-lg"
            : "icon"
      }
      variant="outline"
      {...props}
    >
      {icon}
    </Button>
  );
}

export interface FilterOption<T = unknown> {
  className?: string;
  icon?: React.ReactNode;
  label: string;
  metadata?: Record<string, unknown>;
  value: T;
}

export interface FilterOperator {
  label: string;
  supportsMultiple?: boolean;
  value: string;
}

export interface CustomRendererProps<T = unknown> {
  field: FilterFieldConfig<T>;
  onChange: (values: T[]) => void;
  operator: string;
  values: T[];
}

export interface FilterFieldGroup<T = unknown> {
  fields: FilterFieldConfig<T>[];
  group?: string;
}

export type FilterFieldsConfig<T = unknown> =
  | FilterFieldConfig<T>[]
  | FilterFieldGroup<T>[];

export interface FilterFieldConfig<T = unknown> {
  allowCustomValues?: boolean;
  className?: string;
  customRenderer?: (props: CustomRendererProps<T>) => React.ReactNode;
  customValueRenderer?: (
    values: T[],
    options: FilterOption<T>[]
  ) => React.ReactNode;
  defaultOperator?: string;
  fields?: FilterFieldConfig<T>[];
  group?: string;
  groupLabel?: string;
  icon?: React.ReactNode;
  key?: string;
  label?: string;
  max?: number;
  maxSelections?: number;
  menuPopupClassName?: string;
  min?: number;
  offLabel?: string;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLabel?: string;
  onValueChange?: (values: T[]) => void;
  operators?: FilterOperator[];
  options?: FilterOption<T>[];
  pattern?: string;
  placeholder?: string;
  prefix?: string | React.ReactNode;
  searchable?: boolean;
  step?: number;
  suffix?: string | React.ReactNode;
  type?: "select" | "multiselect" | "text" | "custom" | "separator";
  validation?: (
    value: unknown
  ) => boolean | { valid: boolean; message?: string };
  value?: T[];
}

const isFieldGroup = <T = unknown>(
  item: FilterFieldConfig<T> | FilterFieldGroup<T>
): item is FilterFieldGroup<T> => {
  return "fields" in item && Array.isArray(item.fields);
};

const isGroupLevelField = <T = unknown>(
  field: FilterFieldConfig<T>
): boolean => {
  return Boolean(field.group && field.fields);
};

const flattenFields = <T = unknown>(
  fields: FilterFieldsConfig<T>
): FilterFieldConfig<T>[] => {
  return fields.reduce<FilterFieldConfig<T>[]>((acc, item) => {
    if (isFieldGroup(item)) {
      return [...acc, ...item.fields];
    }
    if (isGroupLevelField(item)) {
      return [...acc, ...item.fields!];
    }
    return [...acc, item];
  }, []);
};

const getFieldsMap = <T = unknown>(
  fields: FilterFieldsConfig<T>
): Record<string, FilterFieldConfig<T>> => {
  const flatFields = flattenFields(fields);
  return flatFields.reduce(
    (acc, field) => {
      if (field.key) {
        acc[field.key] = field;
      }
      return acc;
    },
    {} as Record<string, FilterFieldConfig<T>>
  );
};

const createOperatorsFromI18n = (
  i18n: FilterI18nConfig
): Record<string, FilterOperator[]> => ({
  select: [
    { value: "is", label: i18n.operators.is },
    { value: "is_not", label: i18n.operators.isNot },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  multiselect: [
    { value: "is_any_of", label: i18n.operators.isAnyOf },
    { value: "is_not_any_of", label: i18n.operators.isNotAnyOf },
    { value: "includes_all", label: i18n.operators.includesAll },
    { value: "excludes_all", label: i18n.operators.excludesAll },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  text: [
    { value: "contains", label: i18n.operators.contains },
    { value: "not_contains", label: i18n.operators.notContains },
    { value: "starts_with", label: i18n.operators.startsWith },
    { value: "ends_with", label: i18n.operators.endsWith },
    { value: "is", label: i18n.operators.isExactly },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  custom: [
    { value: "is", label: i18n.operators.is },
    { value: "after", label: i18n.operators.after },
    { value: "is", label: i18n.operators.is },
    { value: "between", label: i18n.operators.between },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
});

export const DEFAULT_OPERATORS: Record<string, FilterOperator[]> =
  createOperatorsFromI18n(DEFAULT_I18N);

const getOperatorsForField = <T = unknown>(
  field: FilterFieldConfig<T>,
  values: T[],
  i18n: FilterI18nConfig
): FilterOperator[] => {
  if (field.operators) {
    return field.operators;
  }

  const operators = createOperatorsFromI18n(i18n);

  let fieldType = field.type || "select";

  if (fieldType === "select" && values.length > 1) {
    fieldType = "multiselect";
  }

  if (fieldType === "multiselect" || field.type === "multiselect") {
    return operators.multiselect;
  }

  return operators[fieldType] || operators.select;
};

interface FilterOperatorDropdownProps<T = unknown> {
  field: FilterFieldConfig<T>;
  onChange: (operator: string) => void;
  operator: string;
  values: T[];
}

function FilterOperatorDropdown<T = unknown>({
  field,
  operator,
  values,
  onChange,
}: FilterOperatorDropdownProps<T>) {
  const context = useFilterContext();
  const operators = getOperatorsForField(field, values, context.i18n);

  const operatorLabel =
    operators.find((op) => op.value === operator)?.label ||
    context.i18n.helpers.formatOperator(operator);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="text-muted-foreground hover:text-foreground"
            size={context.size}
            variant="outline"
          >
            {operatorLabel}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((op) => (
          <DropdownMenuItem
            className="flex items-center justify-between data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            key={op.value}
            onClick={() => onChange(op.value)}
          >
            <span>{op.label}</span>
            <CheckIcon
              className={cn(
                "ms-auto text-primary",
                op.value === operator ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface FilterValueSelectorProps<T = unknown> {
  autoFocus?: boolean;
  field: FilterFieldConfig<T>;
  onChange: (values: T[]) => void;
  operator: string;
  values: T[];
}

interface SelectOptionsPopoverProps<T = unknown> {
  field: FilterFieldConfig<T>;
  inline?: boolean;
  onChange: (values: T[]) => void;
  onClose?: () => void;
  values: T[];
}

function SelectOptionsPopover<T = unknown>({
  field,
  values,
  onChange,
  onClose,
  inline = false,
}: SelectOptionsPopoverProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const context = useFilterContext();
  const baseId = useId();

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    if (highlightedIndex >= 0 && open) {
      const element = document.getElementById(
        `${baseId}-item-${highlightedIndex}`
      );
      element?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, open, baseId]);

  const isMultiSelect = field.type === "multiselect" || values.length > 1;
  const effectiveValues =
    (field.value !== undefined ? (field.value as T[]) : values) || [];

  const selectedOptions =
    field.options?.filter((opt) => effectiveValues.includes(opt.value)) || [];
  const unselectedOptions =
    field.options?.filter((opt) => !effectiveValues.includes(opt.value)) || [];

  // Keep selected options visible while search narrows only the remaining options.
  const filteredSelectedOptions = selectedOptions;
  const filteredUnselectedOptions = unselectedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchInput.toLowerCase())
  );

  const allFilteredOptions = useMemo(
    () => [...filteredSelectedOptions, ...filteredUnselectedOptions],
    [filteredSelectedOptions, filteredUnselectedOptions]
  );

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const renderMenuContent = () => (
    <>
      {field.searchable !== false && (
        <>
          <Input
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${baseId}-item-${highlightedIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={`${baseId}-listbox`}
            aria-expanded={true}
            aria-haspopup="listbox"
            className={cn(
              "h-8 rounded-none border-0 border-input bg-transparent! px-2 text-sm shadow-none",
              "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0",
              open && "placeholder:text-foreground"
            )}
            onBlur={() => open && inputRef.current?.focus()}
            onChange={(e) => setSearchInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (allFilteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev < allFilteredOptions.length - 1 ? prev + 1 : 0
                  );
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (allFilteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : allFilteredOptions.length - 1
                  );
                }
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                setOpen(false);
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault();
                const option = allFilteredOptions[highlightedIndex];
                if (option) {
                  const isSelected = effectiveValues.includes(
                    option.value as T
                  );
                  const next = isSelected
                    ? (effectiveValues.filter((v) => v !== option.value) as T[])
                    : isMultiSelect
                      ? ([...effectiveValues, option.value] as T[])
                      : ([option.value] as T[]);

                  if (
                    !isSelected &&
                    isMultiSelect &&
                    field.maxSelections &&
                    next.length > field.maxSelections
                  ) {
                    return;
                  }

                  if (field.onValueChange) {
                    field.onValueChange(next);
                  } else {
                    onChange(next);
                  }
                  if (!isMultiSelect) {
                    handleClose();
                  }
                }
              }
              e.stopPropagation();
            }}
            placeholder={context.i18n.placeholders.searchField(
              field.label || ""
            )}
            ref={inputRef}
            role="combobox"
            value={searchInput}
          />
          <DropdownMenuSeparator />
        </>
      )}
      <div className="relative flex max-h-full">
        <div
          className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain"
          id={`${baseId}-listbox`}
          role="listbox"
        >
          <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 [&_[data-slot=scroll-area-viewport]]:h-full [&_[data-slot=scroll-area-viewport]]:overscroll-contain">
            {allFilteredOptions.length === 0 && (
              <div className="py-2 text-center text-muted-foreground text-sm">
                {context.i18n.noResultsFound}
              </div>
            )}

            {filteredSelectedOptions.length > 0 && (
              <DropdownMenuGroup className="px-1">
                {filteredSelectedOptions.map((option, index) => {
                  const isHighlighted = highlightedIndex === index;
                  const itemId = `${baseId}-item-${index}`;

                  return (
                    <DropdownMenuCheckboxItem
                      aria-selected={isHighlighted}
                      checked={true}
                      className={cn(
                        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                        option.className
                      )}
                      data-highlighted={isHighlighted || undefined}
                      id={itemId}
                      key={String(option.value)}
                      onCheckedChange={() => {
                        const next = effectiveValues.filter(
                          (v) => v !== option.value
                        ) as T[];
                        if (field.onValueChange) {
                          field.onValueChange(next);
                        } else {
                          onChange(next);
                        }
                        if (!isMultiSelect) {
                          handleClose();
                        }
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onSelect={(e) => {
                        if (isMultiSelect) {
                          e.preventDefault();
                        }
                      }}
                      role="option"
                    >
                      {option.icon && option.icon}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
            )}

            {filteredSelectedOptions.length > 0 &&
              filteredUnselectedOptions.length > 0 && (
                <DropdownMenuSeparator className="mx-0" />
              )}

            {filteredUnselectedOptions.length > 0 && (
              <DropdownMenuGroup className="px-1">
                {filteredUnselectedOptions.map((option, index) => {
                  const overallIndex = index + filteredSelectedOptions.length;
                  const isHighlighted = highlightedIndex === overallIndex;
                  const itemId = `${baseId}-item-${overallIndex}`;

                  return (
                    <DropdownMenuCheckboxItem
                      aria-selected={isHighlighted}
                      checked={false}
                      className={cn(
                        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                        option.className
                      )}
                      data-highlighted={isHighlighted || undefined}
                      id={itemId}
                      key={String(option.value)}
                      onCheckedChange={() => {
                        const next = isMultiSelect
                          ? ([...effectiveValues, option.value] as T[])
                          : ([option.value] as T[]);

                        if (
                          isMultiSelect &&
                          field.maxSelections &&
                          next.length > field.maxSelections
                        ) {
                          return;
                        }

                        if (field.onValueChange) {
                          field.onValueChange(next);
                        } else {
                          onChange(next);
                        }
                        if (!isMultiSelect) {
                          handleClose();
                        }
                      }}
                      onMouseEnter={() => setHighlightedIndex(overallIndex)}
                      onSelect={(e) => {
                        if (isMultiSelect) {
                          e.preventDefault();
                        }
                      }}
                      role="option"
                    >
                      {option.icon && option.icon}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
            )}
          </ScrollArea>
        </div>
      </div>
    </>
  );

  if (inline) {
    return <div className="w-full">{renderMenuContent()}</div>;
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setTimeout(() => setSearchInput(""), 200);
        }
      }}
      open={open}
    >
      <DropdownMenuTrigger
        render={
          <Button size={context.size} variant="outline">
            <div className="flex items-center gap-1.5">
              {field.customValueRenderer ? (
                field.customValueRenderer(values, field.options || [])
              ) : (
                <>
                  {selectedOptions.length > 0 && (
                    <div className="flex items-center -space-x-1.5">
                      {selectedOptions.slice(0, 3).map((option) => (
                        <div key={String(option.value)}>{option.icon}</div>
                      ))}
                    </div>
                  )}
                  {selectedOptions.length === 1
                    ? selectedOptions[0].label
                    : selectedOptions.length > 1
                      ? `${selectedOptions.length} ${context.i18n.selectedCount}`
                      : context.i18n.select}
                </>
              )}
            </div>
          </Button>
        }
      />
      <DropdownMenuContent
        align="start"
        className={cn("w-[200px] px-0", field.className)}
      >
        {renderMenuContent()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterValueSelector<T = unknown>({
  field,
  values,
  onChange,
  operator,
  autoFocus,
}: FilterValueSelectorProps<T>) {
  const context = useFilterContext();

  if (operator === "empty" || operator === "not_empty") {
    return null;
  }

  if (field.customRenderer) {
    return (
      <ButtonGroupText className="whitespace-nowrap bg-background text-start outline-hidden hover:bg-accent aria-expanded:bg-accent dark:bg-input/30">
        {field.customRenderer({ field, values, onChange, operator })}
      </ButtonGroupText>
    );
  }

  if (field.type === "text") {
    return (
      <FilterInput
        autoFocus={autoFocus}
        className={cn("w-36", field.className)}
        field={field}
        onChange={(e) => onChange([e.target.value] as T[])}
        pattern={field.pattern}
        placeholder={field.placeholder}
        type="text"
        value={(values[0] as string) || ""}
      />
    );
  }

  if (field.type === "select" || field.type === "multiselect") {
    return (
      <SelectOptionsPopover field={field} onChange={onChange} values={values} />
    );
  }

  return (
    <SelectOptionsPopover field={field} onChange={onChange} values={values} />
  );
}
export interface Filter<T = unknown> {
  field: string;
  id: string;
  operator: string;
  values: T[];
}

export interface FilterGroup<T = unknown> {
  fields: FilterFieldConfig<T>[];
  filters: Filter<T>[];
  id: string;
  label?: string;
}

interface FiltersContentProps<T = unknown> {
  fields: FilterFieldsConfig<T>;
  filters: Filter<T>[];
  onChange: (filters: Filter<T>[]) => void;
}

export const FiltersContent = <T = unknown>({
  filters,
  fields,
  onChange,
}: FiltersContentProps<T>) => {
  const context = useFilterContext();
  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields]);

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((filter) => {
          if (filter.id === filterId) {
            const updatedFilter = { ...filter, ...updates };
            if (
              updates.operator === "empty" ||
              updates.operator === "not_empty"
            ) {
              updatedFilter.values = [] as T[];
            }
            return updatedFilter;
          }
          return filter;
        })
      );
    },
    [filters, onChange]
  );

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId));
    },
    [filters, onChange]
  );

  return (
    <div
      className={cn(
        filtersContainerVariants({
          variant: context.variant,
          size: context.size,
        }),
        context.className
      )}
    >
      {filters.map((filter) => {
        const field = fieldsMap[filter.field];
        if (!field) {
          return null;
        }

        return (
          <ButtonGroup key={filter.id}>
            <ButtonGroupText>
              {field.icon && field.icon}
              {field.label}
            </ButtonGroupText>

            <FilterOperatorDropdown<T>
              field={field}
              onChange={(operator) => updateFilter(filter.id, { operator })}
              operator={filter.operator}
              values={filter.values}
            />

            <FilterValueSelector<T>
              autoFocus={false}
              field={field}
              onChange={(values) => updateFilter(filter.id, { values })}
              operator={filter.operator}
              values={filter.values}
            />

            <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
          </ButtonGroup>
        );
      })}
    </div>
  );
};

interface FiltersProps<T = unknown> {
  allowMultiple?: boolean;
  className?: string;
  collapseAddButton?: boolean;
  enableShortcut?: boolean;
  fields: FilterFieldsConfig<T>;
  filters: Filter<T>[];
  i18n?: Partial<FilterI18nConfig>;
  menuPopupClassName?: string;
  onChange: (filters: Filter<T>[]) => void;
  radius?: "default" | "full";
  shortcutKey?: string;
  shortcutLabel?: string;
  showSearchInput?: boolean;
  size?: "sm" | "default" | "lg";
  trigger?: React.ReactNode;
  variant?: "solid" | "default";
}

interface FilterSubmenuContentProps<T = unknown> {
  currentValues: T[];
  field: FilterFieldConfig<T>;
  i18n: FilterI18nConfig;
  isActive?: boolean;
  isMultiSelect: boolean;
  onActive?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  onToggle: (value: T, isSelected: boolean) => void;
}

function FilterSubmenuContent<T = unknown>({
  field,
  currentValues,
  isMultiSelect,
  onToggle,
  i18n,
  isActive,
  onActive,
  onBack,
  onClose,
}: FilterSubmenuContentProps<T>) {
  const [searchInput, setSearchInput] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();

  useEffect(() => {
    if (isActive) {
      if (field.searchable !== false) {
        inputRef.current?.focus();
      } else {
        const listbox = document.getElementById(`${baseId}-listbox`);
        listbox?.focus();
      }
    }
  }, [isActive, field.searchable, baseId]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    if (highlightedIndex >= 0 && isActive) {
      const element = document.getElementById(
        `${baseId}-item-${highlightedIndex}`
      );
      element?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isActive, baseId]);

  const filteredOptions = useMemo(() => {
    return (
      field.options?.filter((option) => {
        const isSelected = currentValues.includes(option.value);
        if (isSelected) {
          return true;
        }
        if (!searchInput) {
          return true;
        }
        return option.label.toLowerCase().includes(searchInput.toLowerCase());
      }) || []
    );
  }, [field.options, searchInput, currentValues]);

  useEffect(() => {
    if (isActive && filteredOptions.length > 0) {
      setHighlightedIndex(0);
    }
  }, [isActive, filteredOptions.length]);

  return (
    <div className="flex flex-col" onMouseEnter={onActive}>
      {field.searchable !== false && (
        <>
          <Input
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${baseId}-item-${highlightedIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={`${baseId}-listbox`}
            aria-expanded={true}
            aria-haspopup="listbox"
            className={cn(
              "h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none",
              "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0",
              isActive && "placeholder:text-foreground"
            )}
            onBlur={() => isActive && inputRef.current?.focus()}
            onChange={(e) => setSearchInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onFocus={() => onActive?.()}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                  );
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                  );
                }
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                onBack?.();
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault();
                const option = filteredOptions[highlightedIndex];
                if (option) {
                  onToggle(
                    option.value as T,
                    currentValues.includes(option.value)
                  );
                  if (!isMultiSelect) {
                    onBack?.();
                  }
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose?.();
              }
              e.stopPropagation();
            }}
            onMouseEnter={(e) => {
              onActive?.();
              e.stopPropagation();
            }}
            placeholder={i18n.placeholders.searchField(field.label || "")}
            ref={inputRef}
            role="combobox"
            value={searchInput}
          />
          <DropdownMenuSeparator />
        </>
      )}
      <div className="relative flex max-h-full">
        <div
          className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain outline-hidden"
          id={`${baseId}-listbox`}
          onKeyDown={(e) => {
            if (field.searchable === false) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                  );
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                  );
                }
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                onBack?.();
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault();
                const option = filteredOptions[highlightedIndex];
                if (option) {
                  onToggle(
                    option.value as T,
                    currentValues.includes(option.value)
                  );
                  if (!isMultiSelect) {
                    onBack?.();
                  }
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose?.();
              }
              e.stopPropagation();
            }
          }}
          role="listbox"
          tabIndex={field.searchable === false ? 0 : -1}
        >
          <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 [&_[data-slot=scroll-area-viewport]]:h-full [&_[data-slot=scroll-area-viewport]]:overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="py-2 text-center text-muted-foreground text-sm">
                {i18n.noResultsFound}
              </div>
            ) : (
              <DropdownMenuGroup>
                {filteredOptions.map((option, index) => {
                  const isSelected = currentValues.includes(option.value);
                  const isHighlighted = highlightedIndex === index;
                  const itemId = `${baseId}-item-${index}`;

                  return (
                    <DropdownMenuCheckboxItem
                      aria-selected={isHighlighted}
                      checked={isSelected}
                      className={cn(
                        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                        option.className
                      )}
                      data-highlighted={isHighlighted || undefined}
                      id={itemId}
                      key={String(option.value)}
                      onCheckedChange={() =>
                        onToggle(option.value as T, isSelected)
                      }
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onSelect={(e) => {
                        if (isMultiSelect) {
                          e.preventDefault();
                        }
                      }}
                      role="option"
                    >
                      {option.icon && option.icon}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export function Filters<T = unknown>({
  filters,
  fields,
  onChange,
  className,
  variant = "default",
  size = "default",
  radius = "default",
  i18n,
  showSearchInput = true,
  trigger,
  allowMultiple = true,
  menuPopupClassName,
  enableShortcut = false,
  shortcutKey = "f",
  shortcutLabel = "F",
}: FiltersProps<T>) {
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [menuSearchInput, setMenuSearchInput] = useState("");
  const [activeMenu, setActiveMenu] = useState<string>("root");
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [lastAddedFilterId, setLastAddedFilterId] = useState<string | null>(
    null
  );
  const rootInputRef = useRef<HTMLInputElement>(null);
  const rootId = useId();

  useEffect(() => {
    if (!enableShortcut) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === shortcutKey.toLowerCase() &&
        !addFilterOpen &&
        !(
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault();
        setAddFilterOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableShortcut, shortcutKey, addFilterOpen]);

  useEffect(() => {
    if (addFilterOpen && activeMenu === "root") {
      rootInputRef.current?.focus();
    }
  }, [addFilterOpen, activeMenu]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    if (highlightedIndex >= 0 && addFilterOpen) {
      const element = document.getElementById(
        `${rootId}-item-${highlightedIndex}`
      );
      element?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, addFilterOpen, rootId]);

  useEffect(() => {
    if (!addFilterOpen) {
      setOpenSubMenu(null);
    }
  }, [addFilterOpen]);

  // Keep a stable filter ID per field during one Add Filter menu session.
  const [sessionFilterIds, setSessionFilterIds] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (lastAddedFilterId) {
      const timer = setTimeout(() => {
        setLastAddedFilterId(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedFilterId]);

  const mergedI18n: FilterI18nConfig = {
    ...DEFAULT_I18N,
    ...i18n,
    operators: { ...DEFAULT_I18N.operators, ...i18n?.operators },
    placeholders: { ...DEFAULT_I18N.placeholders, ...i18n?.placeholders },
    validation: { ...DEFAULT_I18N.validation, ...i18n?.validation },
  };

  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields]);

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((filter) => {
          if (filter.id === filterId) {
            const updatedFilter = { ...filter, ...updates };
            if (
              updates.operator === "empty" ||
              updates.operator === "not_empty"
            ) {
              updatedFilter.values = [] as T[];
            }
            return updatedFilter;
          }
          return filter;
        })
      );
    },
    [filters, onChange]
  );

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId));
    },
    [filters, onChange]
  );

  const addFilter = useCallback(
    (fieldKey: string) => {
      const field = fieldsMap[fieldKey];
      if (field?.key) {
        const defaultOperator =
          field.defaultOperator ||
          (field.type === "multiselect" ? "is_any_of" : "is");
        const defaultValues: unknown[] = field.type === "text" ? [""] : [];
        const newFilter = createFilter<T>(
          fieldKey,
          defaultOperator,
          defaultValues as T[]
        );
        setLastAddedFilterId(newFilter.id);
        onChange([...filters, newFilter]);
        setAddFilterOpen(false);
        setMenuSearchInput("");
      }
    },
    [fieldsMap, filters, onChange]
  );

  useEffect(() => {
    if (addFilterOpen && activeMenu === "root") {
      rootInputRef.current?.focus();
    }
  }, [addFilterOpen, activeMenu]);

  const selectableFields = useMemo(() => {
    const flatFields = flattenFields(fields);
    return flatFields.filter((field) => {
      if (!field.key || field.type === "separator") {
        return false;
      }
      if (allowMultiple) {
        return true;
      }
      return !filters.some((filter) => filter.field === field.key);
    });
  }, [fields, filters, allowMultiple]);

  const filteredFields = useMemo(() => {
    return selectableFields.filter(
      (f) =>
        !menuSearchInput ||
        f.label?.toLowerCase().includes(menuSearchInput.toLowerCase())
    );
  }, [selectableFields, menuSearchInput]);

  useEffect(() => {
    if (addFilterOpen && filteredFields.length > 0) {
      setHighlightedIndex(0);
    }
  }, [addFilterOpen, filteredFields.length]);

  const triggerButton = useRender({
    render: trigger as React.ReactElement,
    defaultTagName: "button",
  });

  return (
    <FilterContext.Provider
      value={{
        variant,
        size,
        radius,
        i18n: mergedI18n,
        className,
        trigger,
        allowMultiple,
      }}
    >
      <div
        className={cn(filtersContainerVariants({ variant, size }), className)}
      >
        {selectableFields.length > 0 && (
          <DropdownMenu
            onOpenChange={(open) => {
              setAddFilterOpen(open);
              if (open) {
                setActiveMenu("root");
              } else {
                setMenuSearchInput("");
                setSessionFilterIds({});
              }
            }}
            open={addFilterOpen}
          >
            <DropdownMenuTrigger render={triggerButton} />
            <DropdownMenuContent
              align="start"
              className={cn("w-[220px]", menuPopupClassName)}
            >
              {showSearchInput && (
                <>
                  <div className="relative">
                    <Input
                      aria-activedescendant={
                        highlightedIndex >= 0
                          ? `${rootId}-item-${highlightedIndex}`
                          : undefined
                      }
                      aria-controls={`${rootId}-listbox`}
                      className={cn(
                        "h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none",
                        "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0",
                        activeMenu === "root" && "placeholder:text-foreground"
                      )}
                      onBlur={() =>
                        activeMenu === "root" && rootInputRef.current?.focus()
                      }
                      onChange={(e) => setMenuSearchInput(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={() => setActiveMenu("root")}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          if (filteredFields.length > 0) {
                            setHighlightedIndex((prev) =>
                              prev < filteredFields.length - 1 ? prev + 1 : 0
                            );
                          }
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          if (filteredFields.length > 0) {
                            setHighlightedIndex((prev) =>
                              prev > 0 ? prev - 1 : filteredFields.length - 1
                            );
                          }
                        } else if (
                          (e.key === "ArrowRight" || e.key === "ArrowLeft") &&
                          highlightedIndex >= 0
                        ) {
                          const field = filteredFields[highlightedIndex];
                          const hasSubMenu =
                            field &&
                            (field.type === "select" ||
                              field.type === "multiselect") &&
                            field.options?.length;

                          if (e.key === "ArrowRight" && hasSubMenu) {
                            e.preventDefault();
                            setOpenSubMenu(field.key || null);
                            setActiveMenu(field.key || "root");
                          } else if (e.key === "ArrowLeft") {
                            e.preventDefault();
                            if (openSubMenu) {
                              setOpenSubMenu(null);
                              setActiveMenu("root");
                            }
                          }
                        } else if (e.key === "Enter" && highlightedIndex >= 0) {
                          e.preventDefault();
                          const field = filteredFields[highlightedIndex];
                          if (field.key) {
                            const hasSubMenu =
                              (field.type === "select" ||
                                field.type === "multiselect") &&
                              field.options?.length;
                            if (hasSubMenu) {
                              if (openSubMenu === field.key) {
                                setOpenSubMenu(null);
                                setActiveMenu("root");
                              } else {
                                setOpenSubMenu(field.key);
                                setActiveMenu(field.key);
                              }
                            } else {
                              addFilter(field.key);
                            }
                          }
                        } else if (e.key === "Escape") {
                          setAddFilterOpen(false);
                        }
                        e.stopPropagation();
                      }}
                      onMouseEnter={() => setActiveMenu("root")}
                      placeholder={mergedI18n.searchFields}
                      ref={rootInputRef}
                      role="combobox"
                      value={menuSearchInput}
                    />
                    {enableShortcut && shortcutLabel && (
                      <Kbd className="absolute top-1/2 right-2 -translate-y-1/2 border bg-background">
                        {shortcutLabel}
                      </Kbd>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}

              <div className="relative flex max-h-full">
                <div
                  className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain"
                  id={`${rootId}-listbox`}
                  onMouseEnter={() => setActiveMenu("root")}
                  role="listbox"
                >
                  <ScrollArea className="**:data-[slot=scroll-area-scrollbar]:m-0">
                    {(() => {
                      if (filteredFields.length === 0) {
                        return (
                          <div className="py-2 text-center text-muted-foreground text-sm">
                            {mergedI18n.noFieldsFound}
                          </div>
                        );
                      }

                      return filteredFields.map((field, index) => {
                        const isHighlighted = highlightedIndex === index;
                        const itemId = `${rootId}-item-${index}`;
                        const hasSubMenu =
                          (field.type === "select" ||
                            field.type === "multiselect") &&
                          field.options?.length;

                        if (hasSubMenu) {
                          const isMultiSelect = field.type === "multiselect";
                          const fieldKey = field.key as string;
                          const sessionFilterId = sessionFilterIds[fieldKey];
                          const sessionFilter = sessionFilterId
                            ? filters.find((f) => f.id === sessionFilterId)
                            : null;
                          const currentValues = sessionFilter?.values || [];

                          return (
                            <DropdownMenuSub
                              key={fieldKey}
                              onOpenChange={(open) => {
                                if (open) {
                                  setOpenSubMenu(fieldKey);
                                } else if (openSubMenu === fieldKey) {
                                  setOpenSubMenu(null);
                                  setActiveMenu("root");
                                }
                              }}
                              open={openSubMenu === fieldKey}
                            >
                              <DropdownMenuSubTrigger
                                aria-selected={isHighlighted}
                                className="data-highlighted:bg-accent data-popup-open:bg-accent data-highlighted:text-accent-foreground data-popup-open:text-accent-foreground"
                                data-highlighted={isHighlighted || undefined}
                                id={itemId}
                                onMouseEnter={() => {
                                  setHighlightedIndex(index);
                                  setActiveMenu("root");
                                }}
                                role="option"
                              >
                                {field.icon}
                                <span>{field.label}</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent
                                className="w-[200px]"
                                side="right"
                              >
                                <FilterSubmenuContent
                                  currentValues={currentValues}
                                  field={field}
                                  i18n={mergedI18n}
                                  isActive={activeMenu === fieldKey}
                                  isMultiSelect={isMultiSelect}
                                  onActive={() => {
                                    if (field.searchable !== false) {
                                      setActiveMenu(fieldKey);
                                    }
                                  }}
                                  onBack={() => {
                                    setOpenSubMenu(null);
                                    setActiveMenu("root");
                                  }}
                                  onClose={() => setAddFilterOpen(false)}
                                  onToggle={(value, isSelected) => {
                                    if (isMultiSelect) {
                                      const nextValues = isSelected
                                        ? (currentValues.filter(
                                            (v) => v !== value
                                          ) as T[])
                                        : ([...currentValues, value] as T[]);

                                      if (sessionFilter) {
                                        if (nextValues.length === 0) {
                                          onChange(
                                            filters.filter(
                                              (f) => f.id !== sessionFilter.id
                                            )
                                          );
                                          setSessionFilterIds((prev) => ({
                                            ...prev,
                                            [fieldKey]: "",
                                          }));
                                        } else {
                                          onChange(
                                            filters.map((f) =>
                                              f.id === sessionFilter.id
                                                ? { ...f, values: nextValues }
                                                : f
                                            )
                                          );
                                        }
                                      } else {
                                        const newFilter = createFilter<T>(
                                          fieldKey,
                                          field.defaultOperator || "is_any_of",
                                          nextValues
                                        );
                                        onChange([...filters, newFilter]);
                                        setSessionFilterIds((prev) => ({
                                          ...prev,
                                          [fieldKey]: newFilter.id,
                                        }));
                                      }
                                    } else {
                                      const newFilter = createFilter<T>(
                                        fieldKey,
                                        field.defaultOperator || "is",
                                        [value] as T[]
                                      );
                                      setLastAddedFilterId(newFilter.id);
                                      onChange([...filters, newFilter]);
                                      setAddFilterOpen(false);
                                    }
                                  }}
                                />
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          );
                        }

                        return (
                          <DropdownMenuItem
                            aria-selected={isHighlighted}
                            className="data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            data-highlighted={isHighlighted || undefined}
                            id={itemId}
                            key={field.key}
                            onClick={() => field.key && addFilter(field.key)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            role="option"
                          >
                            {field.icon}
                            <span>{field.label}</span>
                          </DropdownMenuItem>
                        );
                      });
                    })()}
                  </ScrollArea>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {filters.map((filter) => {
          const field = fieldsMap[filter.field];
          if (!field) {
            return null;
          }
          return (
            <ButtonGroup key={filter.id}>
              <ButtonGroupText className="bg-background dark:bg-input/30">
                {field.icon && field.icon}
                {field.label}
              </ButtonGroupText>
              <FilterOperatorDropdown<T>
                field={field}
                onChange={(operator) => updateFilter(filter.id, { operator })}
                operator={filter.operator}
                values={filter.values}
              />
              <FilterValueSelector<T>
                autoFocus={filter.id === lastAddedFilterId}
                field={field}
                onChange={(values) => updateFilter(filter.id, { values })}
                operator={filter.operator}
                values={filter.values}
              />
              <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
            </ButtonGroup>
          );
        })}
      </div>
    </FilterContext.Provider>
  );
}

export const createFilter = <T = unknown>(
  field: string,
  operator?: string,
  values: T[] = []
): Filter<T> => ({
  id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  field,
  operator: operator || "is",
  values,
});

export const createFilterGroup = <T = unknown>(
  id: string,
  label: string,
  fields: FilterFieldConfig<T>[],
  initialFilters: Filter<T>[] = []
): FilterGroup<T> => ({
  id,
  label,
  filters: initialFilters,
  fields,
});
