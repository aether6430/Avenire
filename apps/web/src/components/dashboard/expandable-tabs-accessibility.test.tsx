import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ListChecks, Chat as MessageSquare } from "@phosphor-icons/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpandableTabs } from "../../../../../packages/ui/src/components/expandable-tabs";

const removedOnboardingModalSurfaceFile = path.resolve(
  import.meta.dirname,
  "./onboarding-modal-surface.tsx"
);

function countOccurrences(source: string, text: string) {
  return source.split(text).length - 1;
}

describe("ExpandableTabs accessibility", () => {
  it("does not duplicate the selected tab label in markup", () => {
    const html = renderToStaticMarkup(
      <ExpandableTabs
        allowDeselect={false}
        items={[
          { icon: MessageSquare, label: "Methods", value: "chat" },
          { icon: ListChecks, label: "Tasks", value: "tasks" },
        ]}
        value="chat"
      />
    );

    expect(countOccurrences(html, ">Methods<")).toBe(1);
    expect(countOccurrences(html, ">Tasks<")).toBe(1);
  });

  it("keeps the remaining shared motion surfaces on motion/react instead of framer-motion", () => {
    const files = [
      path.resolve(
        import.meta.dirname,
        "../../../../../packages/ui/src/components/expandable-tabs.tsx"
      ),
      path.resolve(
        import.meta.dirname,
        "../../../../../packages/ui/src/components/dropdown.tsx"
      ),
      path.resolve(
        import.meta.dirname,
        "../../../../../packages/ui/src/components/menu-item.tsx"
      ),
      path.resolve(import.meta.dirname, "../files/pdf-viewer.tsx"),
    ];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain('from "motion/react"');
      expect(source).not.toContain('from "framer-motion"');
    }

    expect(existsSync(removedOnboardingModalSurfaceFile)).toBe(false);
  });
});
