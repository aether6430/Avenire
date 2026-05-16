import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getBackendEnvFilePaths, loadBackendEnv } from "./load-env";

test("getBackendEnvFilePaths orders repo and backend env files by specificity", () => {
  const backendSrcDir = "/tmp/avenire/apps/backend/src";

  assert.deepEqual(getBackendEnvFilePaths(backendSrcDir), [
    "/tmp/avenire/.env",
    "/tmp/avenire/apps/backend/.env",
    "/tmp/avenire/.env.local",
    "/tmp/avenire/apps/backend/.env.local",
  ]);
});

test("loadBackendEnv lets later files override earlier file values but preserves shell env", () => {
  const root = mkdtempSync(join(tmpdir(), "avenire-backend-env-"));
  const backendSrcDir = join(root, "apps/backend/src");
  const backendDir = join(root, "apps/backend");

  mkdirSync(backendSrcDir, { recursive: true });

  try {
    writeFileSync(
      join(root, ".env"),
      "FROM_ROOT=root\nOVERRIDE_ME=root\nROOT_ONLY=root-only\n"
    );
    writeFileSync(
      join(backendDir, ".env"),
      "FROM_BACKEND=backend\nOVERRIDE_ME=backend\n"
    );
    writeFileSync(
      join(root, ".env.local"),
      "FROM_ROOT_LOCAL=root-local\nOVERRIDE_ME=root-local\n"
    );
    writeFileSync(
      join(backendDir, ".env.local"),
      "FROM_BACKEND_LOCAL=backend-local\nOVERRIDE_ME=backend-local\n"
    );

    const env = {
      SHELL_ONLY: "shell",
      OVERRIDE_ME: "shell-value",
    } as NodeJS.ProcessEnv;

    loadBackendEnv({
      backendDir: backendSrcDir,
      processEnv: env,
    });

    assert.equal(env.SHELL_ONLY, "shell");
    assert.equal(env.OVERRIDE_ME, "shell-value");
    assert.equal(env.FROM_ROOT, "root");
    assert.equal(env.ROOT_ONLY, "root-only");
    assert.equal(env.FROM_BACKEND, "backend");
    assert.equal(env.FROM_ROOT_LOCAL, "root-local");
    assert.equal(env.FROM_BACKEND_LOCAL, "backend-local");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("loadBackendEnv applies .env.local overrides when no shell value is present", () => {
  const root = mkdtempSync(join(tmpdir(), "avenire-backend-env-"));
  const backendSrcDir = join(root, "apps/backend/src");
  const backendDir = join(root, "apps/backend");

  mkdirSync(backendSrcDir, { recursive: true });

  try {
    writeFileSync(join(root, ".env"), "ACTIVE=repo\n");
    writeFileSync(join(backendDir, ".env"), "ACTIVE=backend\n");
    writeFileSync(join(root, ".env.local"), "ACTIVE=repo-local\n");
    writeFileSync(join(backendDir, ".env.local"), "ACTIVE=backend-local\n");

    const env = {} as NodeJS.ProcessEnv;

    loadBackendEnv({
      backendDir: backendSrcDir,
      processEnv: env,
    });

    assert.equal(env.ACTIVE, "backend-local");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
