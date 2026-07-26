import type { EvidenceLocator } from "./domain";

export interface MaterializationCandidate {
  readonly artifactId: string;
  readonly chunkId: string;
  readonly content: string;
  readonly endMs?: number | null;
  readonly page?: number | null;
  readonly sheet?: string | null;
  readonly slide?: number | null;
  readonly startMs?: number | null;
}

export interface EvidenceTarget {
  readonly artifactId: string;
  readonly evidenceId: string;
  readonly locator: EvidenceLocator;
}

export interface MaterializedEvidence {
  readonly chunkIds: readonly string[];
  readonly evidenceId: string;
}

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

function overlapsTimeRange(
  candidate: MaterializationCandidate,
  startMs: number,
  endMs: number
) {
  if (candidate.startMs === null || candidate.startMs === undefined) {
    return false;
  }
  const candidateEnd = candidate.endMs ?? candidate.startMs;
  return candidate.startMs <= endMs && candidateEnd >= startMs;
}

function matchesLocator(
  candidate: MaterializationCandidate,
  locator: EvidenceLocator
) {
  switch (locator.kind) {
    case "document":
      return true;
    case "page":
      return candidate.page === locator.page;
    case "slide":
      return (
        candidate.slide === locator.slide || candidate.page === locator.slide
      );
    case "sheet":
      return (
        candidate.sheet === locator.sheet &&
        (locator.cell === undefined ||
          normalizeText(candidate.content).includes(
            normalizeText(locator.cell)
          ))
      );
    case "time":
      return overlapsTimeRange(candidate, locator.startMs, locator.endMs);
    case "text":
      return normalizeText(candidate.content).includes(
        normalizeText(locator.needle)
      );
  }
}

export function materializeEvidence(
  targets: readonly EvidenceTarget[],
  candidates: readonly MaterializationCandidate[]
): MaterializedEvidence[] {
  return targets.map((target) => ({
    evidenceId: target.evidenceId,
    chunkIds: Array.from(
      new Set(
        candidates
          .filter(
            (candidate) =>
              candidate.artifactId === target.artifactId &&
              matchesLocator(candidate, target.locator)
          )
          .map((candidate) => candidate.chunkId)
      )
    ),
  }));
}
