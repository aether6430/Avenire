import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractEmbeddingsFromResponse,
  validateEmbeddingDimensions,
} from "./embedding-response";
import { embedMultimodal, textToMultimodalInput } from "./embeddings";

describe("embedding response parsing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses Cohere float embeddings", () => {
    expect(
      extractEmbeddingsFromResponse({
        embeddings: {
          float: [
            [0.1, 0.2],
            [0.3, 0.4],
          ],
        },
      })
    ).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });

  it("parses array-of-object embeddings", () => {
    expect(
      extractEmbeddingsFromResponse({
        embeddings: [{ embedding: [1, 2] }, { embedding: [3, 4] }],
      })
    ).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("parses OpenAI-style data entries in index order", () => {
    expect(
      extractEmbeddingsFromResponse({
        data: [
          { index: 2, embedding: [2] },
          { index: 0, embeddings: { float: [0] } },
          { index: 1, embedding: [1] },
        ],
      })
    ).toEqual([[0], [1], [2]]);
  });

  it("rejects malformed vector values", () => {
    expect(() =>
      extractEmbeddingsFromResponse({ embeddings: [[1, "2"]] })
    ).toThrow(/finite number/);

    expect(() =>
      extractEmbeddingsFromResponse({ embeddings: [[Number.NaN]] })
    ).toThrow(/finite number/);

    expect(() =>
      extractEmbeddingsFromResponse({
        data: [{ index: 0, embedding: [Number.POSITIVE_INFINITY] }],
      })
    ).toThrow(/finite number/);
  });

  it("validates configured embedding dimensions in embedMultimodal", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          embeddings: {
            float: [[0.1, 0.2]],
          },
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      embedMultimodal([textToMultimodalInput("cell membrane")])
    ).rejects.toThrow(/Cohere embeddings dimension mismatch/);
  });

  it("accepts vectors when dimensions match the expected size", () => {
    expect(() => validateEmbeddingDimensions([[1, 2]], 2)).not.toThrow();
  });
});
