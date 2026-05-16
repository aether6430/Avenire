import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getDatabaseEnvFilePaths, loadDatabaseEnv } from "./load-env";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createEnvFixture() {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "avenire-database-env-"));
  tempDirs.push(repoRoot);

  const packageRoot = path.join(repoRoot, "packages", "database");
  mkdirSync(packageRoot, { recursive: true });

  return { packageRoot, repoRoot };
}

describe("database env loader", () => {
  it("loads repo env files before package env files", () => {
    const { packageRoot, repoRoot } = createEnvFixture();

    writeFileSync(
      path.join(repoRoot, ".env"),
      "DATABASE_URL=postgres://repo\n"
    );
    writeFileSync(path.join(packageRoot, ".env"), "PG_POOL_MAX=12\n");
    writeFileSync(
      path.join(repoRoot, ".env.local"),
      "NEXT_PUBLIC_APP_URL=https://repo.example\n"
    );
    writeFileSync(
      path.join(packageRoot, ".env.local"),
      "UPLOADTHING_SECRET=secret\n"
    );

    const env: NodeJS.ProcessEnv = {};
    loadDatabaseEnv({ packageRootDir: packageRoot, processEnv: env });

    expect(env.DATABASE_URL).toBe("postgres://repo");
    expect(env.PG_POOL_MAX).toBe("12");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://repo.example");
    expect(env.UPLOADTHING_SECRET).toBe("secret");
  });

  it("does not override existing process env values like NODE_ENV", () => {
    const { packageRoot, repoRoot } = createEnvFixture();

    writeFileSync(
      path.join(repoRoot, ".env.local"),
      "NODE_ENV=development\nDATABASE_URL=postgres://env-file\n"
    );

    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://shell",
    };

    loadDatabaseEnv({ packageRootDir: packageRoot, processEnv: env });

    expect(env.NODE_ENV).toBe("production");
    expect(env.DATABASE_URL).toBe("postgres://shell");
  });

  it("builds the expected repo-first env search order", () => {
    const { packageRoot, repoRoot } = createEnvFixture();

    expect(getDatabaseEnvFilePaths(packageRoot)).toEqual([
      path.join(repoRoot, ".env"),
      path.join(packageRoot, ".env"),
      path.join(repoRoot, ".env.local"),
      path.join(packageRoot, ".env.local"),
    ]);
  });
});
