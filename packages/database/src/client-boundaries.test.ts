import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const clientFile = path.resolve(import.meta.dirname, "./client.ts");
const connectionStringFile = path.resolve(
  import.meta.dirname,
  "./connection-string.ts"
);
const drizzleConfigFile = path.resolve(
  import.meta.dirname,
  "../drizzle.config.ts"
);
const packageJsonFile = path.resolve(import.meta.dirname, "../package.json");
const scriptFile = path.resolve(
  import.meta.dirname,
  "../../../apps/web/scripts/send-pending-waitlist-emails.ts"
);

describe("database client boundaries", () => {
  it("keeps filesystem env loading out of the shared runtime client and shares the postgres connection normalizer with drizzle config", () => {
    const clientSource = readFileSync(clientFile, "utf8");
    const connectionStringSource = readFileSync(connectionStringFile, "utf8");
    const drizzleConfigSource = readFileSync(drizzleConfigFile, "utf8");
    const packageJsonSource = readFileSync(packageJsonFile, "utf8");
    const scriptSource = readFileSync(scriptFile, "utf8");

    expect(clientSource).not.toContain('from "./load-env"');
    expect(clientSource).not.toContain("loadDatabaseEnv()");
    expect(clientSource).toContain('from "./connection-string"');
    expect(clientSource).not.toContain(
      "function normalizePostgresConnectionString"
    );

    expect(drizzleConfigSource).toContain('from "./src/connection-string"');
    expect(drizzleConfigSource).not.toContain(
      "function normalizePostgresConnectionString"
    );
    expect(connectionStringSource).toContain(
      "export function normalizePostgresConnectionString"
    );

    expect(scriptSource).not.toContain('from "@avenire/database/load-env"');
    expect(scriptSource).not.toContain("loadDatabaseEnv()");
    expect(scriptSource).toContain('from "@avenire/database"');
    expect(scriptSource).toContain('from "@avenire/database/client"');

    expect(packageJsonSource).not.toContain('"./load-env"');
    expect(packageJsonSource).toContain('"./client": "./src/client.ts"');
  });
});
