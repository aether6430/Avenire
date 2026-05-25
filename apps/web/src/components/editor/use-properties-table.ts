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
  convertPropertyType,
  normalizeEditablePropertyKey,
  parseFormattedPropertyValue,
} from "@/components/editor/properties-table-model";
import {
  createEmptyProperty,
  type FilePropertyType,
  type FrontmatterProperties,
  formatPropertyValue,
  type NumberPropertyDisplay,
  normalizeFrontmatterProperties,
  normalizePropertyOptions,
  setPropertyValue,
  type WorkspacePropertyDefinition,
} from "@/lib/frontmatter";

interface UsePropertiesTableInput {
  definitions: WorkspacePropertyDefinition[];
  onChange: (properties: FrontmatterProperties) => void;
  onDefinitionsChange?: (definitions: WorkspacePropertyDefinition[]) => void;
  onSummarizePage?: () => Promise<string | null>;
  properties: FrontmatterProperties;
}

export function usePropertiesTable({
  definitions,
  onChange,
  onDefinitionsChange,
  onSummarizePage,
  properties,
}: UsePropertiesTableInput) {
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<FilePropertyType>("text");
  const [optionDraft, setOptionDraft] = useState("");
  const [valueOptionDraft, setValueOptionDraft] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [typePickerKey, setTypePickerKey] = useState<string | null>(null);
  const [openPropertyEditorKey, setOpenPropertyEditorKey] = useState<
    string | null
  >(null);
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

  const getDefinitionOptions = useCallback(
    (
      key: string,
      property = normalizeFrontmatterProperties(properties)[key]
    ) => {
      const normalizedKey = normalizeEditablePropertyKey(key);
      const definition = definitionByKey.get(normalizedKey);
      const seededOptions =
        property?.type === "select" && property.value
          ? [property.value]
          : property?.type === "multi_select"
            ? property.value
            : [];

      return normalizePropertyOptions([
        ...(definition?.options ?? []),
        ...seededOptions,
      ]);
    },
    [definitionByKey, properties]
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
    setOpenPropertyEditorKey(trimmedKey);
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
      setOpenPropertyEditorKey(key);
      setNewType("text");
      return key;
    },
    [onChange, onSummarizePage, properties, syncDefinition]
  );

  const handleAddPropertyOption = useCallback(
    (key: string) => {
      const normalizedKey = normalizeEditablePropertyKey(key);
      const normalizedProperties = normalizeFrontmatterProperties(properties);
      const property = normalizedProperties[normalizedKey];
      const option = optionDraft.trim();

      if (
        !(
          option &&
          property &&
          (property.type === "select" || property.type === "multi_select")
        )
      ) {
        return;
      }

      syncDefinition(normalizedKey, property.type, [option]);
      setOptionDraft("");
    },
    [optionDraft, properties, syncDefinition]
  );

  const handleDuplicateProperty = useCallback(
    (key: string) => {
      const normalizedKey = normalizeEditablePropertyKey(key);
      const normalizedProperties = normalizeFrontmatterProperties(properties);
      const property = normalizedProperties[normalizedKey];
      if (!property) {
        return;
      }

      const baseKey = `${normalizedKey} copy`;
      let nextKey = baseKey;
      let counter = 2;
      while (normalizedProperties[nextKey]) {
        nextKey = `${baseKey} ${counter}`;
        counter += 1;
      }

      const nextProperty =
        property.type === "multi_select"
          ? { ...property, value: [...property.value] }
          : { ...property };

      onChange(
        normalizeFrontmatterProperties({
          ...normalizedProperties,
          [nextKey]: nextProperty,
        })
      );
      syncDefinition(
        nextKey,
        property.type,
        getDefinitionOptions(normalizedKey)
      );
      setOpenPropertyEditorKey(nextKey);
    },
    [getDefinitionOptions, onChange, properties, syncDefinition]
  );

  const handleDeleteProperty = useCallback(
    (key: string) => {
      const normalizedKey = normalizeEditablePropertyKey(key);
      const normalizedProperties = normalizeFrontmatterProperties(properties);
      const { [normalizedKey]: _removed, ...rest } = normalizedProperties;
      onChange(rest);
      setOpenPropertyEditorKey(null);
    },
    [onChange, properties]
  );

  const handlePropertyTypeChange = useCallback(
    (key: string, type: FilePropertyType) => {
      const normalizedKey = normalizeEditablePropertyKey(key);
      const normalizedProperties = normalizeFrontmatterProperties(properties);
      const property = normalizedProperties[normalizedKey];
      if (!property) {
        return;
      }

      const nextProperty = convertPropertyType(property, type);
      onChange(
        normalizeFrontmatterProperties({
          ...normalizedProperties,
          [normalizedKey]: nextProperty,
        })
      );
      syncDefinition(
        normalizedKey,
        type,
        nextProperty.type === "select" && nextProperty.value
          ? [nextProperty.value]
          : nextProperty.type === "multi_select"
            ? nextProperty.value
            : []
      );
    },
    [onChange, properties, syncDefinition]
  );

  const handleNumberDisplayChange = useCallback(
    (
      key: string,
      patch: Partial<{
        display: NumberPropertyDisplay;
        total: number | null;
      }>
    ) => {
      const normalizedKey = normalizeEditablePropertyKey(key);
      const normalizedProperties = normalizeFrontmatterProperties(properties);
      const property = normalizedProperties[normalizedKey];
      if (!(property?.type === "number")) {
        return;
      }

      onChange(
        normalizeFrontmatterProperties({
          ...normalizedProperties,
          [normalizedKey]: {
            ...property,
            ...patch,
          },
        })
      );
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

  return {
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
  };
}
