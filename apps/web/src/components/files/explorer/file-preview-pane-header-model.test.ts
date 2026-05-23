import { describe, expect, it } from "vitest";
import { getFilePreviewPaneHeaderMoveTargets } from "@/components/files/explorer/file-preview-pane-header-model";
import type { FolderRecord } from "@/components/files/explorer/shared";

describe("file preview pane header model", () => {
  it("filters move targets down to writable folders and caps the list", () => {
    const folders = Array.from({ length: 24 }, (_, index) => ({
      id: `folder-${index + 1}`,
      name: `Folder ${index + 1}`,
      parentId: null,
      readOnly: index % 5 === 0,
    })) satisfies FolderRecord[];

    const targets = getFilePreviewPaneHeaderMoveTargets(folders);

    expect(targets).toHaveLength(19);
    expect(targets.every((folder) => !folder.readOnly)).toBe(true);
    expect(targets[0]?.id).toBe("folder-2");
    expect(targets.at(-1)?.id).toBe("folder-24");
  });
});
