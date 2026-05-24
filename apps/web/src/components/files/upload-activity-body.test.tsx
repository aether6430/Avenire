import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UploadActivityBody } from "@/components/files/upload-activity-body";

describe("UploadActivityBody", () => {
  it("renders an explicit load failure instead of a calm empty activity state", () => {
    const html = renderToStaticMarkup(
      <UploadActivityBody
        completedCount={0}
        errorMessage="Recent uploads timed out."
        failedCount={0}
        loadFailed
        loading={false}
        onClearCompleted={() => {}}
        onClose={() => {}}
        queue={[]}
        uploadCount={0}
      />
    );

    expect(html).toContain("Unable to load upload activity.");
    expect(html).toContain("Recent uploads timed out.");
    expect(html).toContain('data-slot="empty"');
    expect(html).not.toContain("No activity yet");
  });
});
