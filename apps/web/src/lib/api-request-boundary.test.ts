import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const apiRoot = path.resolve(process.cwd(), "src/app/api");

async function listProductionTypeScriptFiles(
  directory: string
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listProductionTypeScriptFiles(absolutePath);
      }
      if (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".d.ts")
      ) {
        return [absolutePath];
      }
      return [];
    })
  );
  return nested.flat();
}

function lineNumberAt(source: string, index: number) {
  return source.slice(0, index).split("\n").length;
}

interface BoundaryViolation {
  file: string;
  line: number;
  rule: string;
}

function collectMatches(
  source: string,
  expression: RegExp,
  file: string,
  rule: string
): BoundaryViolation[] {
  return [...source.matchAll(expression)].map((match) => ({
    file,
    line: lineNumberAt(source, match.index),
    rule,
  }));
}

function findApiRequestBoundaryViolations(
  source: string,
  file: string
): BoundaryViolation[] {
  const violations = collectMatches(
    source,
    /\b(?:request|req|input\.request)\.json\s*\(/g,
    file,
    "direct Request.json body read"
  );

  violations.push(
    ...collectMatches(
      source,
      /(?:await\s+(?:request|req|input\.request)\.(?:json|text)\s*\([^)]*\)|JSON\.parse\s*\(\s*await\s+(?:request|req|input\.request)\.text\s*\([^)]*\)\s*\))\s+as\s+/g,
      file,
      "asserted request body"
    )
  );

  const parsesUnknownJson =
    /parseJsonRequest\s*\([\s\S]*?(?:unknownJsonRequestSchema|Schema\.Unknown)[\s\S]*?\)/m.test(
      source
    );
  if (parsesUnknownJson) {
    violations.push(
      ...collectMatches(
        source,
        /\b(?:z\.[A-Za-z][\w]*\([^;]*\)|[A-Za-z_$][\w$]*(?:Schema)?)[.]safeParse\s*\(/g,
        file,
        "route-level Zod validation after Schema.Unknown"
      )
    );
  }

  return violations;
}

describe("API request boundary", () => {
  it("detects every forbidden external JSON boundary pattern", () => {
    expect(
      findApiRequestBoundaryViolations(
        `
          const direct = await request.json();
          const asserted = JSON.parse(await request.text()) as Payload;
          const body = await parseJsonRequest(request, unknownJsonRequestSchema);
          const parsed = requestSchema.safeParse(body.data);
        `,
        "fixture.ts"
      ).map(({ rule }) => rule)
    ).toEqual([
      "direct Request.json body read",
      "asserted request body",
      "route-level Zod validation after Schema.Unknown",
    ]);
  });

  it("keeps production API request bodies on schema-decoded boundaries", async () => {
    const files = await listProductionTypeScriptFiles(apiRoot);
    const violations = (
      await Promise.all(
        files.map(async (file) => {
          const source = await readFile(file, "utf8");
          return findApiRequestBoundaryViolations(
            source,
            path.relative(process.cwd(), file)
          );
        })
      )
    ).flat();

    expect(
      violations,
      violations
        .map(({ file, line, rule }) => `${file}:${line} ${rule}`)
        .join("\n")
    ).toEqual([]);
  });
});
