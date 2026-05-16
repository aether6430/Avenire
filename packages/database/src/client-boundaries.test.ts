import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const clientFile = path.resolve(import.meta.dirname, "./client.ts");
const scriptFile = path.resolve(
  import.meta.dirname,
  "../../../apps/web/scripts/send-pending-waitlist-emails.ts"
);

describe("database client boundaries", () => {
  it("keeps filesystem env loading out of the shared runtime client", () => {
    const clientSource = readFileSync(clientFile, "utf8");
    const scriptSource = readFileSync(scriptFile, "utf8");

    expect(clientSource).not.toContain('from "./load-env"');
    expect(clientSource).not.toContain("loadDatabaseEnv()");

    expect(scriptSource).toContain('from "@avenire/database/load-env"');
    expect(scriptSource).toContain("loadDatabaseEnv()");
  });
});
