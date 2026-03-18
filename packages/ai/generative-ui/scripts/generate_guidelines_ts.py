#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SECTIONS_DIR = ROOT / "visual-guidelines" / "sections"
OUT_FILE = ROOT / "guidelines.ts"

LABEL_TO_FILE = {
    "_preamble": "preamble.md",
    "Modules": "modules.md",
    "Core Design System": "core_design_system.md",
    "When nothing fits": "when_nothing_fits.md",
    "SVG setup": "svg_setup.md",
    "Color palette": "color_palette.md",
    "UI components": "ui_components.md",
    "Diagram types": "diagram_types.md",
    "Charts (Chart.js)": "charts_chart_js.md",
    "Art and illustration": "art_and_illustration.md",
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def escape_template_literal(text: str) -> str:
    # Escape backticks and ${ to avoid template interpolation
    return text.replace("`", "\\`").replace("${", "\\${")


def main() -> None:
    mapping_path = SECTIONS_DIR / "mapping.json"
    mapping: dict[str, list[str]] = json.loads(read_text(mapping_path))

    sections: dict[str, str] = {}
    for label in LABEL_TO_FILE:
        file_name = LABEL_TO_FILE[label]
        path = SECTIONS_DIR / file_name
        if not path.exists():
            raise SystemExit(f"Missing section file: {path}")
        sections[label] = read_text(path)

    # Validate mapping labels
    missing = sorted({label for labels in mapping.values() for label in labels} - set(LABEL_TO_FILE.keys()))
    if missing:
        raise SystemExit(f"Missing label->file entries for: {', '.join(missing)}")

    lines: list[str] = []
    lines.append("// This file is generated. Do not edit by hand.")
    lines.append("// Run: python3 packages/ai/generative-ui/scripts/generate_guidelines_ts.py")
    lines.append("")

    lines.append("const SECTION_BY_LABEL: Record<string, string> = {")
    for label, content in sections.items():
        escaped = escape_template_literal(content)
        lines.append(f"  {json.dumps(label)}: `" + escaped + "`,")
    lines.append("};")
    lines.append("")

    lines.append("const MODULE_MAPPING: Record<string, string[]> = {")
    for module, labels in mapping.items():
        labels_json = ", ".join(json.dumps(label) for label in labels)
        lines.append(f"  {json.dumps(module)}: [{labels_json}],")
    lines.append("};")
    lines.append("")

    lines.append("export const AVAILABLE_MODULES = Object.keys(MODULE_MAPPING);")
    lines.append("")

    lines.append("export function getGuidelines(modules: string[]): string {")
    lines.append("  let content = \"\";")
    lines.append("  const seen = new Set<string>();")
    lines.append("")
    lines.append("  for (const mod of modules) {")
    lines.append("    const sections = MODULE_MAPPING[mod];")
    lines.append("    if (!sections) continue;")
    lines.append("")
    lines.append("    for (const label of sections) {")
    lines.append("      if (seen.has(label)) continue;")
    lines.append("      seen.add(label);")
    lines.append("")
    lines.append("      const sectionText = SECTION_BY_LABEL[label];")
    lines.append("      if (sectionText === undefined) {")
    lines.append("        throw new Error(`Unknown guideline section label: ${label}`);")
    lines.append("      }")
    lines.append("")
    lines.append("      if (content) content += \"\\n\\n\";")
    lines.append("      content += sectionText;")
    lines.append("    }")
    lines.append("  }")
    lines.append("")
    lines.append("  return content + \"\\n\";")
    lines.append("}")
    lines.append("")

    OUT_FILE.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
