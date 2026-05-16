import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type SkillSection = "study-guidelines" | "visual-guidelines";

interface ParsedFrontmatter {
  attributes: {
    description?: string;
    name?: string;
  };
  body: string;
}

interface SkillEntry {
  content: string;
  description: string | null;
  id: string;
  path: string | null;
  section: SkillSection;
  sourceIds?: string[];
  title: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SECTIONS_DIR = path.join(ROOT_DIR, "sections");
const OUTPUT_FILE = path.join(ROOT_DIR, "skills.ts");

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

function toKebabCase(value: string) {
  return value
    .replace(/\.md$/i, "")
    .replace(/[_\s]+/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function humanize(value: string) {
  return value
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function parseFrontmatter(raw: string): ParsedFrontmatter {
  if (!raw.startsWith("---\n")) {
    return { attributes: {}, body: raw };
  }

  const endIndex = raw.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return { attributes: {}, body: raw };
  }

  const header = raw.slice(4, endIndex);
  const body = raw.slice(endIndex + 5);
  const attributes: ParsedFrontmatter["attributes"] = {};

  for (const line of header.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)\s*$/);
    if (!match) {
      continue;
    }

    const [, key, value] = match;
    if (key === "name" || key === "description") {
      attributes[key] = value.trim();
    }
  }

  return { attributes, body };
}

function extractTitle(body: string, fallback: string) {
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || humanize(fallback);
}

function escapeTemplateLiteral(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function serializeContent(value: string) {
  return value.includes("\n")
    ? `\`${escapeTemplateLiteral(value)}\``
    : JSON.stringify(value);
}

async function readMarkdownEntries() {
  const sections = (await readdir(SECTIONS_DIR, { withFileTypes: true }))
    .filter((entry): entry is typeof entry & { name: SkillSection } =>
      entry.isDirectory()
    )
    .map((entry) => entry.name)
    .sort();

  const entries: SkillEntry[] = [];

  async function walkMarkdownFiles(section: SkillSection, dir: string) {
    const dirEntries = (await readdir(dir, { withFileTypes: true })).sort(
      (left, right) => left.name.localeCompare(right.name)
    );

    for (const entry of dirEntries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkMarkdownFiles(section, entryPath);
        continue;
      }

      if (!(entry.isFile() && entry.name.endsWith(".md"))) {
        continue;
      }

      const raw = await readFile(entryPath, "utf8");
      const parsed = parseFrontmatter(raw);
      const fallbackId = toKebabCase(entry.name);
      const id = parsed.attributes.name?.trim() || fallbackId;

      entries.push({
        content: raw,
        description: parsed.attributes.description?.trim() ?? null,
        id,
        path: toPosixPath(path.relative(ROOT_DIR, entryPath)),
        section,
        title: extractTitle(parsed.body, id),
      });
    }
  }

  for (const section of sections) {
    const sectionDir = path.join(SECTIONS_DIR, section);
    await walkMarkdownFiles(section, sectionDir);
  }

  return entries;
}

async function buildSkillMap() {
  const fileEntries = await readMarkdownEntries();
  const skillMap = new Map<string, SkillEntry>();

  for (const entry of fileEntries) {
    if (skillMap.has(entry.id)) {
      throw new Error(`Duplicate skill id: ${entry.id}`);
    }
    skillMap.set(entry.id, entry);
  }

  const mappingPath = path.join(
    SECTIONS_DIR,
    "visual-guidelines",
    "mapping.json"
  );
  const visualSkillMapping = JSON.parse(
    await readFile(mappingPath, "utf8")
  ) as Record<string, string[]>;

  for (const [bundleId, sourceIds] of Object.entries(visualSkillMapping)) {
    const parts = sourceIds.map((sourceId) => {
      const entry = skillMap.get(sourceId);
      if (!entry) {
        throw new Error(
          `Unknown skill id "${sourceId}" referenced by "${bundleId}"`
        );
      }
      return entry.content;
    });

    skillMap.set(bundleId, {
      content: `${parts.join("\n\n")}\n`,
      description: `Visual generation guidelines bundle for ${bundleId}.`,
      id: bundleId,
      path: null,
      section: "visual-guidelines",
      sourceIds,
      title: humanize(bundleId),
    });
  }

  return {
    entries: Array.from(skillMap.values()).sort((left, right) =>
      left.id.localeCompare(right.id)
    ),
    visualSkillIds: Object.keys(visualSkillMapping).sort(),
  };
}

async function main() {
  const { entries, visualSkillIds } = await buildSkillMap();
  const templateInterpolation = "${";
  const studySkillIds = entries
    .filter((entry) => entry.section === "study-guidelines")
    .map((entry) => entry.id)
    .sort();
  const lines: string[] = [];

  lines.push("// This file is generated. Do not edit by hand.");
  lines.push("// Run: bun packages/ai/skills/scripts/generator.ts");
  lines.push("");
  lines.push(
    'export type SkillSection = "study-guidelines" | "visual-guidelines";'
  );
  lines.push("");
  lines.push("export interface SkillDefinition {");
  lines.push("  content: string;");
  lines.push("  description: string | null;");
  lines.push("  id: string;");
  lines.push("  path: string | null;");
  lines.push("  section: SkillSection;");
  lines.push("  sourceIds?: readonly string[];");
  lines.push("  title: string;");
  lines.push("}");
  lines.push("");
  lines.push("export const SKILL_MAP = {");

  for (const entry of entries) {
    lines.push(`  ${JSON.stringify(entry.id)}: {`);
    lines.push(`    id: ${JSON.stringify(entry.id)},`);
    lines.push(`    title: ${JSON.stringify(entry.title)},`);
    lines.push(`    description: ${JSON.stringify(entry.description)},`);
    lines.push(`    section: ${JSON.stringify(entry.section)},`);
    lines.push(`    path: ${JSON.stringify(entry.path)},`);
    lines.push(`    content: ${serializeContent(entry.content)},`);
    if (entry.sourceIds) {
      lines.push(`    sourceIds: ${JSON.stringify(entry.sourceIds)} as const,`);
    }
    lines.push("  },");
  }

  lines.push("} as const satisfies Record<string, SkillDefinition>;");
  lines.push("");
  lines.push("export type SkillId = keyof typeof SKILL_MAP;");
  lines.push("");
  lines.push(
    `export const AVAILABLE_STUDY_SKILLS = ${JSON.stringify(studySkillIds)} as const;`
  );
  lines.push("");
  lines.push(
    `export const AVAILABLE_VISUAL_SKILLS = ${JSON.stringify(visualSkillIds)} as const;`
  );
  lines.push("");
  lines.push(
    "export const AVAILABLE_SKILLS = Object.keys(SKILL_MAP) as SkillId[];"
  );
  lines.push("");
  lines.push("export function getSkill(skillId: string) {");
  lines.push("  return SKILL_MAP[skillId as SkillId] ?? null;");
  lines.push("}");
  lines.push("");
  lines.push("export function loadSkills(skillIds: string[]) {");
  lines.push("  const seen = new Set<string>();");
  lines.push('  let content = "";');
  lines.push("");
  lines.push("  for (const skillId of skillIds) {");
  lines.push("    if (seen.has(skillId)) {");
  lines.push("      continue;");
  lines.push("    }");
  lines.push("    seen.add(skillId);");
  lines.push("");
  lines.push("    const skill = getSkill(skillId);");
  lines.push("    if (!skill) {");
  lines.push(
    `      throw new Error(\`Unknown skill: ${templateInterpolation}skillId}\`);`
  );
  lines.push("    }");
  lines.push("");
  lines.push("    if (content) {");
  lines.push('      content += "\\n\\n";');
  lines.push("    }");
  lines.push("    content += skill.content.trimEnd();");
  lines.push("  }");
  lines.push("");
  lines.push(
    `  return content ? \`${templateInterpolation}content}\\n\` : "";`
  );
  lines.push("}");
  lines.push("");
  lines.push("export function getGuidelines(modules: string[]) {");
  lines.push("  return loadSkills(modules);");
  lines.push("}");
  lines.push("");

  await writeFile(OUTPUT_FILE, `${lines.join("\n")}`, "utf8");
  execFileSync("pnpm", ["exec", "biome", "format", "--write", "./skills.ts"], {
    cwd: ROOT_DIR,
    stdio: "ignore",
  });
}

await main();
