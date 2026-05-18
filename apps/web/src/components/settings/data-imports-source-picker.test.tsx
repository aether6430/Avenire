import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataImportsSourcePicker } from "@/components/settings/data-imports-source-picker";

describe("DataImportsSourcePicker", () => {
  it("renders the visible import sources and provider status labels", () => {
    const html = renderToStaticMarkup(
      <DataImportsSourcePicker
        googleStatus={{
          accountId: "google-1",
          configured: true,
          connected: true,
          hasRefreshToken: true,
          hasUsableAccessToken: true,
          ready: true,
          scopes: [],
        }}
        notionStatus={{
          accountId: null,
          configured: false,
          connected: false,
          hasRefreshToken: false,
          hasUsableAccessToken: false,
          ready: false,
          scopes: [],
        }}
        onSelect={() => {}}
      />
    );

    expect(html).toContain("Choose a source to import from");
    expect(html).toContain("Google Drive");
    expect(html).toContain("Files, Docs, Sheets");
    expect(html).toContain("Ready");
    expect(html).toContain("Not linked");
    expect(html).toContain("Notion");
    expect(html).toContain("Pages, databases");
    expect(html.match(/Select →/g)?.length).toBe(2);
  });
});
