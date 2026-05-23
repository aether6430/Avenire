import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DesktopCallbackPage, { dynamic, metadata } from "./page";

describe("desktop callback page contract", () => {
  it("keeps route metadata aligned and request-driven", () => {
    expect(metadata.title).toBe("Return to Avenire Desktop — Avenire");
    expect(dynamic).toBe("force-dynamic");
  });

  it("renders a ready handoff state when both code and state are present", async () => {
    const element = await DesktopCallbackPage({
      searchParams: Promise.resolve({
        code: "code-1",
        state: "state-1",
      }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain(">Return to Avenire Desktop</h1>");
    expect(html).toContain(
      "Your sign-in details are ready. Return to the desktop app to continue."
    );
    expect(html).toContain("Authorization code:");
    expect(html).toContain("Received");
    expect(html).toContain("Session state:");
    expect(html).toContain("Open workspace on web");
    expect(html).not.toContain("Continue to workspace");
  });

  it("renders an incomplete handoff state when callback params are missing", async () => {
    const element = await DesktopCallbackPage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain(
      "This sign-in handoff is incomplete. Return to Avenire Desktop and try again from there."
    );
    expect(html).toContain("Missing");
    expect(html).toContain("Open workspace on web");
  });
});
