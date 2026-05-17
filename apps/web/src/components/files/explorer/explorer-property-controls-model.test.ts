import { describe, expect, it } from "vitest";
import {
  buildDefaultExplorerCardPropertyKeys,
  buildExplorerAvailablePropertyDefinitions,
  deserializeExplorerPropertyFilters,
  filterExplorerAvailablePropertyDefinitions,
  getExplorerPropertyFilterDefaultOperator,
  selectExplorerCardPropertyDefinitions,
  serializeExplorerPropertyFilters,
  toggleExplorerCardPropertyKey,
} from "@/components/files/explorer/explorer-property-controls-model";
import type { FileRecord } from "@/components/files/explorer/shared";
import type { PropertyFilterState } from "@/components/files/explorer/workspace-folder-browse-model";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";

function createFileRecord(
  id: string,
  properties: NonNullable<FileRecord["page"]>["properties"]
) {
  return {
    id,
    folderId: "folder-1",
    name: `${id}.md`,
    page: {
      bannerUrl: null,
      icon: null,
      properties,
    },
  } as FileRecord;
}

describe("Explorer property controls model", () => {
  it("merges property definitions with file-derived options and keeps them sorted", () => {
    const files = [
      createFileRecord("file-1", {
        priority: { type: "select", value: "high" },
        tags: { type: "multi_select", value: ["ops", "docs"] },
      }),
      createFileRecord("file-2", {
        priority: { type: "select", value: "low" },
        tags: { type: "multi_select", value: ["docs", "qa"] },
      }),
    ];
    const definitions: WorkspacePropertyDefinition[] = [
      {
        key: "owner",
        options: [],
        type: "text",
      },
    ];

    const merged = buildExplorerAvailablePropertyDefinitions(
      files,
      definitions
    );

    expect(merged.map((definition) => definition.key)).toEqual([
      "owner",
      "priority",
      "tags",
    ]);
    expect(
      merged.find((definition) => definition.key === "priority")?.options
    ).toEqual(["high", "low"]);
    expect(
      merged.find((definition) => definition.key === "tags")?.options
    ).toEqual(["docs", "ops", "qa"]);
  });

  it("serializes and deserializes property filters without losing multi-select semantics", () => {
    const filters: PropertyFilterState[] = [
      {
        id: "priority",
        key: "priority",
        operator: "eq",
        type: "select",
        value: "high",
      },
      {
        id: "tags",
        key: "tags",
        operator: "contains_any",
        type: "multi_select",
        value: "ops, qa",
      },
    ];
    const propertyDefinitionByKey = new Map<
      string,
      WorkspacePropertyDefinition
    >([
      [
        "priority",
        { key: "priority", options: ["high", "low"], type: "select" },
      ],
      [
        "tags",
        { key: "tags", options: ["docs", "ops", "qa"], type: "multi_select" },
      ],
    ]);

    const roundTrip = deserializeExplorerPropertyFilters(
      serializeExplorerPropertyFilters(filters),
      propertyDefinitionByKey
    );

    expect(roundTrip).toEqual(filters);
  });

  it("builds and mutates card-field selections within the visible-card limit", () => {
    const definitions: WorkspacePropertyDefinition[] = [
      { key: "alpha", options: [], type: "text" },
      { key: "beta", options: [], type: "text" },
      { key: "gamma", options: [], type: "text" },
      { key: "delta", options: [], type: "text" },
      { key: "epsilon", options: [], type: "text" },
    ];

    const defaults = buildDefaultExplorerCardPropertyKeys(definitions);
    expect(defaults).toEqual(["alpha", "beta", "gamma"]);

    const expanded = toggleExplorerCardPropertyKey(defaults, "delta", true);
    expect(expanded).toEqual(["alpha", "beta", "gamma", "delta"]);

    const unchangedAtLimit = toggleExplorerCardPropertyKey(
      expanded,
      "epsilon",
      true
    );
    expect(unchangedAtLimit).toEqual(expanded);

    const trimmed = toggleExplorerCardPropertyKey(expanded, "beta", false);
    expect(trimmed).toEqual(["alpha", "gamma", "delta"]);
    expect(
      selectExplorerCardPropertyDefinitions(definitions, trimmed).map(
        (definition) => definition.key
      )
    ).toEqual(["alpha", "gamma", "delta"]);
    expect(
      filterExplorerAvailablePropertyDefinitions(definitions, "ta").map(
        (definition) => definition.key
      )
    ).toEqual(["beta", "delta"]);
    expect(getExplorerPropertyFilterDefaultOperator("text")).toBe("contains");
    expect(getExplorerPropertyFilterDefaultOperator("checkbox")).toBe(
      "is_true"
    );
  });
});
