import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import GlobalError from "./global-error";

describe("global error page", () => {
  it("uses home-first recovery actions while still offering the workspace as a secondary path", () => {
    const html = renderToStaticMarkup(
      <GlobalError
        error={Object.assign(new Error("boom"), { digest: "digest-1" })}
        reset={() => {}}
      />
    );

    expect(html).toContain("Something went wrong.");
    expect(html).toContain("Try again");
    expect(html).toContain('href="/"');
    expect(html).toContain(">Go home<");
    expect(html).toContain('href="/workspace"');
    expect(html).toContain(">Open workspace<");
    expect(html).toContain("reopen the workspace");
  });
});
