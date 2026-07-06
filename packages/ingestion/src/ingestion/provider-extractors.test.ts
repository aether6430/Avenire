import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/safety", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/safety")>();
  return {
    ...actual,
    assertResolvedRemoteUrlIsSafe: vi.fn(async (value: string) =>
      actual.assertSafeUrl(value)
    ),
    safeRemoteFetch: vi.fn(),
  };
});

import { safeRemoteFetch } from "../utils/safety";
import { extractFromSupportedProvider } from "./provider-extractors";

describe("provider extractors", () => {
  afterEach(() => {
    vi.mocked(safeRemoteFetch).mockReset();
  });

  it("extracts Reddit media URLs from post fields and video fallback", async () => {
    vi.mocked(safeRemoteFetch).mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            data: {
              children: [
                {
                  data: {
                    title: "Spaced repetition advice",
                    selftext: "Review before forgetting.",
                    url: "https://example.com/post-image.jpg",
                    url_overridden_by_dest:
                      "https://example.com/canonical-image.jpg",
                    secure_media: {
                      reddit_video: {
                        fallback_url: "https://v.redd.it/video/DASH_720.mp4",
                      },
                    },
                  },
                },
              ],
            },
          },
        ]),
        { status: 200 }
      )
    );

    const result = await extractFromSupportedProvider(
      "https://www.reddit.com/r/learning/comments/abc123/example/"
    );

    expect(result).toMatchObject({
      provider: "reddit",
      title: "Spaced repetition advice",
    });
    expect(result?.content).toContain("Review before forgetting.");
    expect(result?.mediaUrls).toEqual([
      "https://example.com/canonical-image.jpg",
      "https://example.com/post-image.jpg",
      "https://v.redd.it/video/DASH_720.mp4",
    ]);
  });

  it("tolerates unexpected Reddit payload shapes", async () => {
    vi.mocked(safeRemoteFetch).mockResolvedValue(
      new Response(JSON.stringify({ unexpected: true }), {
        status: 200,
      })
    );

    const result = await extractFromSupportedProvider(
      "https://www.reddit.com/r/learning/comments/abc123/example/"
    );

    expect(result).toEqual({
      provider: "reddit",
      title: undefined,
      content:
        "Reddit URL: https://www.reddit.com/r/learning/comments/abc123/example/",
      mediaUrls: [],
    });
  });

  it("drops unsafe provider-derived media URLs", async () => {
    vi.mocked(safeRemoteFetch).mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            data: {
              children: [
                {
                  data: {
                    title: "Unsafe media",
                    url: "http://127.0.0.1/private.mp4",
                    url_overridden_by_dest: "https://example.com/public.mp4",
                  },
                },
              ],
            },
          },
        ]),
        { status: 200 }
      )
    );

    const result = await extractFromSupportedProvider(
      "https://www.reddit.com/r/learning/comments/abc123/example/"
    );

    expect(result?.mediaUrls).toEqual(["https://example.com/public.mp4"]);
  });
});
