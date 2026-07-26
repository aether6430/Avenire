import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Effect, Schema } from "effect-v4";

export class OfficeFixtureGenerationError extends Schema.TaggedErrorClass<OfficeFixtureGenerationError>()(
  "OfficeFixtureGenerationError",
  { message: Schema.String, cause: Schema.Defect() }
) {}

export interface GeneratedOfficeFixture {
  readonly byteSize: number;
  readonly fileName: string;
  readonly sha256: string;
}

interface OfficeFixtureDefinition {
  readonly fileName: string;
  readonly files: Readonly<Record<string, string>>;
}

const contentTypes = (
  overrides: readonly [string, string][]
) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${overrides.map(([part, type]) => `<Override PartName="${part}" ContentType="${type}"/>`).join("\n  ")}
</Types>`;

const packageRelationships = (
  officeDocumentTarget: string
) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${officeDocumentTarget}"/>
</Relationships>`;

const docx: OfficeFixtureDefinition = {
  fileName: "allocation-memo.docx",
  files: {
    "[Content_Types].xml": contentTypes([
      [
        "/word/document.xml",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
      ],
    ]),
    "_rels/.rels": packageRelationships("word/document.xml"),
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Quarterly Allocation Memo</w:t></w:r></w:p>
    <w:p><w:r><w:t>The reserve target is 18 percent of the operating budget.</w:t></w:r></w:p>
    <w:p><w:r><w:t>The approved allocation identifier is ALPHA-27.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Do not confuse this target with the archived 12 percent proposal.</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`,
  },
};

const pptx: OfficeFixtureDefinition = {
  fileName: "retrieval-evaluation-lecture.pptx",
  files: {
    "[Content_Types].xml": contentTypes([
      [
        "/ppt/presentation.xml",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
      ],
      [
        "/ppt/slides/slide1.xml",
        "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
      ],
      [
        "/ppt/slides/slide2.xml",
        "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
      ],
    ]),
    "_rels/.rels": packageRelationships("ppt/presentation.xml"),
    "ppt/_rels/presentation.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
</Relationships>`,
    "ppt/presentation.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,
    "ppt/slides/slide1.xml": presentationSlide([
      "Retrieval Evaluation",
      "A judged benchmark separates ingestion coverage from ranking quality.",
    ]),
    "ppt/slides/slide2.xml": presentationSlide([
      "Ranking Metrics",
      "Mean reciprocal rank rewards the first relevant result.",
      "nDCG preserves graded relevance and position.",
      "EVAL_SLIDE_METRICS_02",
    ]),
  },
};

function presentationSlide(lines: readonly string[]) {
  const shapes = lines
    .map(
      (line, index) => `<p:sp>
      <p:nvSpPr><p:cNvPr id="${index + 2}" name="Text ${index + 1}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US"/><a:t>${line}</a:t></a:r><a:endParaRPr lang="en-US"/></a:p></p:txBody>
    </p:sp>`
    )
    .join("\n    ");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    ${shapes}
  </p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

const xlsx: OfficeFixtureDefinition = {
  fileName: "experiment-results.xlsx",
  files: {
    "[Content_Types].xml": contentTypes([
      [
        "/xl/workbook.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
      ],
      [
        "/xl/worksheets/sheet1.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
      ],
    ]),
    "_rels/.rels": packageRelationships("xl/workbook.xml"),
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Experiment Results" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
  <row r="1"><c r="A1" t="inlineStr"><is><t>Model</t></is></c><c r="B1" t="inlineStr"><is><t>nDCG@10</t></is></c><c r="C1" t="inlineStr"><is><t>Run ID</t></is></c></row>
  <row r="2"><c r="A2" t="inlineStr"><is><t>Apollo</t></is></c><c r="B2"><v>0.842</v></c><c r="C2" t="inlineStr"><is><t>RUN-SHEET-842</t></is></c></row>
  <row r="3"><c r="A3" t="inlineStr"><is><t>Baseline</t></is></c><c r="B3"><v>0.711</v></c><c r="C3" t="inlineStr"><is><t>RUN-SHEET-711</t></is></c></row>
</sheetData></worksheet>`,
  },
};

export const officeFixtureDefinitions = [docx, pptx, xlsx] as const;

function runZip(stagingRoot: string, outputPath: string, files: string[]) {
  return new Promise<void>((resolve, reject) => {
    execFile(
      "zip",
      ["-X", "-D", "-q", outputPath, ...files],
      { cwd: stagingRoot, env: { ...process.env, TZ: "UTC" } },
      (error) => (error ? reject(error) : resolve())
    );
  });
}

async function generateFixture(
  definition: OfficeFixtureDefinition,
  outputRoot: string
): Promise<GeneratedOfficeFixture> {
  const stagingRoot = await mkdtemp(join(tmpdir(), "avenire-office-fixture-"));
  const outputPath = join(outputRoot, definition.fileName);
  try {
    const entries = Object.entries(definition.files).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    const timestamp = new Date("2000-01-01T00:00:00.000Z");
    for (const [path, content] of entries) {
      const absolutePath = join(stagingRoot, path);
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, content, "utf8");
      await utimes(absolutePath, timestamp, timestamp);
    }
    await mkdir(outputRoot, { recursive: true });
    await rm(outputPath, { force: true });
    await runZip(
      stagingRoot,
      outputPath,
      entries.map(([path]) => path)
    );
    const bytes = await readFile(outputPath);
    return {
      byteSize: bytes.byteLength,
      fileName: definition.fileName,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  } finally {
    await rm(stagingRoot, { force: true, recursive: true });
  }
}

export const generateOfficeFixtures = Effect.fn(
  "benchmark.generateOfficeFixtures"
)((outputRoot: string) =>
  Effect.tryPromise({
    try: () =>
      Promise.all(
        officeFixtureDefinitions.map((definition) =>
          generateFixture(definition, outputRoot)
        )
      ),
    catch: (cause) =>
      OfficeFixtureGenerationError.make({
        message: "Unable to generate deterministic Office fixtures",
        cause,
      }),
  })
);
