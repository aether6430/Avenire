import type { CanonicalChunk, ChunkKind, IngestSourceType } from './types';

const TOKENS_PER_WORD = 1.33;
const TARGET_CHUNK_TOKENS = 320;
const MAX_CHUNK_TOKENS = 420;
const OVERLAP_TOKENS = 48;

const wordsFromTokens = (tokens: number): number => {
  return Math.max(1, Math.floor(tokens / TOKENS_PER_WORD));
};

const TARGET_CHUNK_WORDS = wordsFromTokens(TARGET_CHUNK_TOKENS);
const MAX_CHUNK_WORDS = wordsFromTokens(MAX_CHUNK_TOKENS);
const OVERLAP_WORDS = wordsFromTokens(OVERLAP_TOKENS);

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const HEADING_PATTERN =
  /^(?:#{1,6}\s+.+|\*\*[^*]{2,160}\*\*|(?:chapter|section|unit|lesson)\b.+)$/i;
const EQUATION_PATTERN =
  /^(?:\$\$.+\$\$|\$.+\$|\\\[.+\\\]|(?:[A-Za-z0-9_()[\]\\^+\-/*., ]+\s*=\s*){1,}.+)$/;
const SOLVED_EXAMPLE_PATTERN =
  /^(?:example|worked example|solved example|problem|exercise|question)\b[:.\s-]*/i;

const inferKind = (content: string): ChunkKind => {
  const text = content.toLowerCase();
  if (/\b(proof|qed|lemma|theorem|corollary)\b/.test(text)) return 'proof';
  if (/\b(example|for instance|e\.g\.)\b/.test(text)) return 'example';
  if (/\b(derive|derivation|therefore|hence)\b/.test(text)) return 'derivation';
  if (/\b(intuition|think of|imagine)\b/.test(text)) return 'intuition';
  if (/\b(common mistake|pitfall|misconception|wrong)\b/.test(text)) return 'mistake';
  if (/\b(figure|diagram|plot|visual)\b/.test(text)) return 'visualization';
  if (/^#{1,6}\s/.test(content) || /\b(definition|concept)\b/.test(text)) return 'concept';
  return 'generic';
};

const isHeadingBlock = (value: string): boolean => HEADING_PATTERN.test(value.trim());

const isEquationBlock = (value: string): boolean => {
  const normalized = value.trim();
  if (!normalized || normalized.length > 280) {
    return false;
  }

  return normalized
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .every(line => EQUATION_PATTERN.test(line));
};

const isSolvedExampleBlock = (value: string): boolean =>
  SOLVED_EXAMPLE_PATTERN.test(value.trim());

const splitChunkByWords = (
  text: string,
  buildChunk: (content: string) => CanonicalChunk,
): CanonicalChunk[] => {
  const words = text.split(' ');
  const chunks: CanonicalChunk[] = [];

  let start = 0;
  while (start < words.length) {
    const end = Math.min(words.length, start + TARGET_CHUNK_WORDS);
    const window = words.slice(start, end).join(' ').trim();
    if (window) {
      chunks.push(buildChunk(window));
    }

    if (end >= words.length) {
      break;
    }

    start = Math.max(start + 1, end - OVERLAP_WORDS);
  }

  return chunks;
};

export const semanticChunkText = (params: {
  text: string;
  sourceType: IngestSourceType;
  source: string;
  provider?: string;
  page?: number;
  startMs?: number;
  endMs?: number;
  baseMetadata?: Record<string, unknown>;
}): CanonicalChunk[] => {
  const text = params.text.trim();
  if (!text) return [];

  const paragraphs = text
    .split(/\n\s*\n+/)
    .map(segment => normalizeWhitespace(segment))
    .filter(Boolean);

  const chunks: CanonicalChunk[] = [];
  const buildChunk = (content: string): CanonicalChunk => ({
    chunkIndex: chunks.length,
    content,
    kind: inferKind(content),
    metadata: {
      sourceType: params.sourceType,
      source: params.source,
      provider: params.provider,
      page: params.page,
      startMs: params.startMs,
      endMs: params.endMs,
      modality: 'text',
      extra: params.baseMetadata,
    },
  });

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];
    if (!paragraph) {
      continue;
    }

    if (isSolvedExampleBlock(paragraph)) {
      const collected = [paragraph];
      while (index + 1 < paragraphs.length) {
        const next = paragraphs[index + 1];
        if (isHeadingBlock(next) || isSolvedExampleBlock(next)) {
          break;
        }

        collected.push(next);
        index += 1;
      }

      chunks.push(buildChunk(collected.join('\n\n')));
      continue;
    }

    if (isHeadingBlock(paragraph)) {
      const collected = [paragraph];
      while (index + 1 < paragraphs.length) {
        const next = paragraphs[index + 1];
        if (isHeadingBlock(next) || isSolvedExampleBlock(next)) {
          break;
        }

        if (
          collected.join('\n\n').split(' ').length >= TARGET_CHUNK_WORDS ||
          isEquationBlock(next)
        ) {
          break;
        }

        collected.push(next);
        index += 1;
      }

      chunks.push(buildChunk(collected.join('\n\n')));
      continue;
    }

    if (isEquationBlock(paragraph)) {
      chunks.push(buildChunk(paragraph));
      continue;
    }

    const words = paragraph.split(' ');
    if (words.length <= MAX_CHUNK_WORDS) {
      chunks.push(buildChunk(paragraph));
      continue;
    }

    chunks.push(...splitChunkByWords(paragraph, buildChunk));
  }

  chunks.forEach((chunk, index) => {
    chunk.chunkIndex = index;
  });

  return chunks;
};
