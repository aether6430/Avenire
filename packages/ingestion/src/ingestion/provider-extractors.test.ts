import { afterEach, describe, expect, it, vi } from "vitest";
import { extractFromSupportedProvider } from "./provider-extractors";

describe("provider extractors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts Reddit media URLs from post fields and video fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
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
        );
      })
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
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ unexpected: true }), {
          status: 200,
        });
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
});
