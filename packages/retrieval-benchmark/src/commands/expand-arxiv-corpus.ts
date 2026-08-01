import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Schema } from "effect-v4";
import { BenchmarkArtifact, BenchmarkCorpusManifest } from "../domain";

const dataRoot = resolve(import.meta.dirname, "../../data");
const manifestPath = resolve(dataRoot, "manifest.json");
const targetExpansionCount = 44;
const userAgent =
  "AvenireRetrievalBenchmark/0.2 (contact: benchmark@avenire.space)";

const searches = [
  { category: "cs.IR", domain: "information-retrieval" },
  { category: "cs.LG", domain: "machine-learning" },
  { category: "math.OC", domain: "mathematical-optimization" },
  { category: "quant-ph", domain: "quantum-physics" },
] as const;

interface ArxivEntry {
  readonly arxivId: string;
  readonly authors: readonly string[];
  readonly canonicalUrl: string;
  readonly domain: string;
  readonly pdfUrl: string;
  readonly published: string;
  readonly title: string;
}

const sleep = (durationMs: number) =>
  new Promise<void>((resolvePromise) => {
    setTimeout(resolvePromise, durationMs);
  });

const decodeXml = (value: string) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_match, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10))
    );

const compactXmlText = (value: string) =>
  decodeXml(value.replaceAll(/\s+/g, " ").trim());

const matchFirst = (value: string, expression: RegExp) =>
  expression.exec(value)?.[1] ?? null;

const parseFeed = (xml: string, domain: string): readonly ArxivEntry[] =>
  Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).flatMap(
    (entryMatch) => {
      const entry = entryMatch[1];
      if (!entry) {
        return [];
      }
      const idUrl = matchFirst(entry, /<id>([^<]+)<\/id>/);
      const title = matchFirst(entry, /<title>([\s\S]*?)<\/title>/);
      const published = matchFirst(entry, /<published>([^<]+)<\/published>/);
      const pdfUrl = matchFirst(
        entry,
        /<link[^>]+href="([^"]+)"[^>]+type="application\/pdf"[^>]*\/>/
      );
      if (!(idUrl && title && published && pdfUrl)) {
        return [];
      }
      const arxivId = idUrl.split("/abs/").at(-1);
      if (!arxivId) {
        return [];
      }
      const authors = Array.from(
        entry.matchAll(
          /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g
        )
      ).flatMap((author) => (author[1] ? [compactXmlText(author[1])] : []));
      return [
        {
          arxivId,
          authors,
          canonicalUrl: idUrl.replace("http://", "https://"),
          domain,
          pdfUrl: decodeXml(pdfUrl).replace("http://", "https://"),
          published,
          title: compactXmlText(title),
        },
      ];
    }
  );

const fetchWithRetry = async (url: string) => {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": userAgent },
        redirect: "follow",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 5) {
        await sleep(1000 * attempt);
      }
    }
  }
  throw lastError ?? new Error(`Unable to fetch ${url}`);
};

const loadManifest = async () => {
  const value: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
  return Schema.decodeUnknownSync(BenchmarkCorpusManifest)(value);
};

const readOrDownloadPdf = async (entry: ArxivEntry, path: string) => {
  try {
    return new Uint8Array(await readFile(path));
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  }

  const response = await fetchWithRetry(entry.pdfUrl);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 10_000) {
    throw new Error(`${entry.arxivId} returned an implausibly small PDF`);
  }
  await mkdir(dirname(path), { recursive: true });
  const partialPath = `${path}.partial`;
  await writeFile(partialPath, bytes);
  await rename(partialPath, path);
  return bytes;
};

const toArtifact = async (entry: ArxivEntry) => {
  const fileName = `${entry.arxivId.replaceAll(/[/.]/g, "-")}.pdf`;
  const relativePath = `.cache/arxiv/${fileName}`;
  const bytes = await readOrDownloadPdf(entry, resolve(dataRoot, relativePath));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return new BenchmarkArtifact({
    id: `external-arxiv-expansion-${entry.arxivId.replaceAll(/[/.]/g, "-")}`,
    title: entry.title,
    domain: entry.domain,
    sourceType: "pdf",
    format: "pdf-native",
    path: relativePath,
    mimeType: "application/pdf",
    byteSize: bytes.byteLength,
    sha256,
    license: "PRIVATE-BENCHMARK",
    licenseUrl: "https://info.arxiv.org/help/license/index.html",
    creator: entry.authors.join(", ") || "arXiv authors",
    canonicalUrl: entry.canonicalUrl,
    downloadUrl: entry.pdfUrl,
    attribution: `${entry.authors.join(", ") || "arXiv authors"}, ${entry.title}, arXiv:${entry.arxivId}`,
    redistribution: "manifest-only",
  });
};

const main = async () => {
  const manifest = await loadManifest();
  const existingExpansion = manifest.artifacts.filter((artifact) =>
    artifact.id.startsWith("external-arxiv-expansion-")
  );
  if (existingExpansion.length >= targetExpansionCount) {
    process.stdout.write(
      `${JSON.stringify({ added: 0, existing: existingExpansion.length, total: manifest.artifacts.length }, null, 2)}\n`
    );
    return;
  }

  const existingCanonicalUrls = new Set(
    manifest.artifacts.flatMap((artifact) =>
      artifact.canonicalUrl ? [artifact.canonicalUrl] : []
    )
  );
  const candidatesByCanonicalUrl = new Map<string, ArxivEntry>();
  for (const [index, search] of searches.entries()) {
    if (index > 0) {
      await sleep(3000);
    }
    const query = new URL("https://export.arxiv.org/api/query");
    query.searchParams.set("search_query", `cat:${search.category}`);
    query.searchParams.set("start", "0");
    query.searchParams.set("max_results", "20");
    query.searchParams.set("sortBy", "submittedDate");
    query.searchParams.set("sortOrder", "descending");
    const response = await fetchWithRetry(query.toString());
    for (const entry of parseFeed(await response.text(), search.domain)) {
      if (!existingCanonicalUrls.has(entry.canonicalUrl)) {
        candidatesByCanonicalUrl.set(entry.canonicalUrl, entry);
      }
    }
  }

  const required = targetExpansionCount - existingExpansion.length;
  const candidates = Array.from(candidatesByCanonicalUrl.values());
  const selected: ArxivEntry[] = [];
  for (const search of searches) {
    selected.push(
      ...candidates
        .filter((entry) => entry.domain === search.domain)
        .slice(0, Math.ceil(required / searches.length))
    );
  }
  if (selected.length < required) {
    throw new Error(
      `The arXiv API returned only ${selected.length} usable entries; ${required} are required`
    );
  }

  const artifacts: BenchmarkArtifact[] = [];
  for (const [index, entry] of selected.slice(0, required).entries()) {
    process.stdout.write(
      `[${index + 1}/${required}] downloading arXiv:${entry.arxivId} ${entry.title}\n`
    );
    artifacts.push(await toArtifact(entry));
    await sleep(350);
  }

  const updated = new BenchmarkCorpusManifest({
    schemaVersion: 1,
    corpusId: manifest.corpusId,
    version: "0.2.0",
    artifacts: [...manifest.artifacts, ...artifacts],
  });
  const partialPath = `${manifestPath}.partial`;
  await writeFile(partialPath, `${JSON.stringify(updated, null, 2)}\n`);
  await rename(partialPath, manifestPath);
  process.stdout.write(
    `${JSON.stringify({ added: artifacts.length, existing: existingExpansion.length, total: updated.artifacts.length }, null, 2)}\n`
  );
};

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
  );
  process.exitCode = 1;
});
