import { ListChecks, Chat as MessageSquare } from "@phosphor-icons/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpandableTabs } from "../../../../../packages/ui/src/components/expandable-tabs";

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
});
