import { describe, expect, it } from "vitest";
import { parseMistralBatchOutputLines } from "./ocr";

describe("Mistral OCR batch output parsing", () => {
  it("accepts valid rows with custom_id and request.custom_id", () => {
    const rows = parseMistralBatchOutputLines(
      [
        JSON.stringify({
          custom_id: "pdf-0",
          response: {
            body: {
              model: "mistral-ocr-latest",
              pages: [
                {
                  index: 0,
                  markdown: "First page",
                  images: [{ id: "image-1", imageAnnotation: "A diagram" }],
                  tables: [{ id: "table-1", content: "<table></table>" }],
                },
              ],
            },
          },
        }),
        JSON.stringify({
          request: { custom_id: "pdf-1" },
          result: {
            pages: [{ index: 1, markdown: "Second page" }],
          },
        }),
      ].join("\n")
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.customId).toBe("pdf-0");
    expect(rows[0]?.body.pages[0]?.images?.[0]?.imageAnnotation).toBe(
      "A diagram"
    );
    expect(rows[0]?.body.pages[0]?.tables?.[0]?.content).toBe(
      "<table></table>"
    );
    expect(rows[1]?.customId).toBe("pdf-1");
    expect(rows[1]?.body.model).toBeUndefined();
  });

  it("skips malformed JSON and rows without valid pages", () => {
    const rows = parseMistralBatchOutputLines(
      [
        "{not-json",
        JSON.stringify({
          custom_id: "missing-pages",
          response: { body: { model: "mistral-ocr-latest" } },
        }),
        JSON.stringify({
          custom_id: "invalid-page",
          response: {
            body: {
              pages: [{ index: "0", markdown: "Bad page" }],
            },
          },
        }),
        JSON.stringify({
          request: { custom_id: "valid" },
          response: {
            body: {
              pages: [{ index: 0, markdown: "Good page" }],
            },
          },
        }),
      ].join("\n")
    );

    expect(rows.map((row) => row.customId)).toEqual(["valid"]);
    expect(rows[0]?.body.pages[0]?.markdown).toBe("Good page");
  });
});
