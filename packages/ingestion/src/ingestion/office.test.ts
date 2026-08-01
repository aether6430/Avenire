import { beforeEach, describe, expect, it, vi } from "vitest";

const { safeRemoteFetchMock } = vi.hoisted(() => ({
  safeRemoteFetchMock: vi.fn(),
}));

vi.mock("../utils/safety", () => ({
  safeRemoteFetch: safeRemoteFetchMock,
}));

import { ingestOfficeDocument } from "./office";

const DOCX_FIXTURE = Buffer.from(
  "UEsDBBQAAAAIAAAAISggG4bqsgAAAC4BAAALAAAAX3JlbHMvLnJlbHONz7sOgjAUBuCdp2jOLgUHYwyFxZiwGnyApj2URnpJWy+8vR0cxDg4ntt38jfd08zkjiFqZxnUZQUErXBSW8XgMpw2eyAxcSv57CwyWDBC1xbNGWee8k2ctI8kIzYymFLyB0qjmNDwWDqPNk9GFwxPuQyKei6uXCHdVtWOhk8D2oKQFUt6ySD0sgYyLB7/4d04aoFHJ24Gbfrx5WsjyzwoTAweLkgq3+0ys0BzSrqK2b4AUEsDBBQAAAAIAAAAISjXeYTq8QAAALgBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2QzU7DMBCE730Ky9cqccoBIZSkB36OwKE8wMreJFb9J69b2rdn00KREOVozXwz62nXB+/EHjPZGDq5qhspMOhobBg7+b55ru6koALBgIsBO3lEkut+0W6OCUkwHKiTUynpXinSE3qgOiYMrAwxeyj8zKNKoLcworppmlulYygYSlXmDNkvhGgfcYCdK+LpwMr5loyOpHg4e+e6TkJKzmoorKt9ML+Kqq+SmsmThyabaMkGqa6VzOL1jh/0lSfK1qB4g1xewLNRfcRslIl65xmu/0/649o4DFbjhZ/TUo4aiXh77+qL4sGG71+06jR8/wlQSwMEFAAAAAgAAAAhKHpA8x07AQAAQgIAABEAAAB3b3JkL2RvY3VtZW50LnhtbI1RzW7CMAy+8xRW7hDgsKGKFiFN0w6bxDT2ACFx20hpUjluO95+aQdMu0xcElv5/P3E291X46BHijb4XKwWSwHodTDWV7n4PD7PNwIiK2+UCx5zccYodsVsO2Qm6K5Bz5AYfMyGXNTMbSZl1DU2Ki5Ciz69lYEaxamlSg6BTEtBY4xJoHFyvVw+yEZZL4oZQGI9BXMey6lpi/E40HR98NkhDFmvXC6Olh0KWWzlDTAdXLx3ihjJnWHvXNCKUzB4wyaMUJ4G6Gfsr8xl/FgjEEakHoEVVchgI6w20CLpMW0ogRMmhaPE7Ss4dSahFvfTqzZ9QY8G1K9BaxK3LS3SKLd/Pbzs5+vHO0mfAvjAoIMvu5hs14ni4n2wXE9+FenajqKr9S1KstGGqNw/MhE1H0hOy5HX7YzVdfvFN1BLAQIeAxQAAAAIAAAAISggG4bqsgAAAC4BAAALAAAAAAAAAAEAAACkgQAAAABfcmVscy8ucmVsc1BLAQIeAxQAAAAIAAAAISjXeYTq8QAAALgBAAATAAAAAAAAAAEAAACkgdsAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAh4DFAAAAAgAAAAhKHpA8x07AQAAQgIAABEAAAAAAAAAAQAAAKSB/QEAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAADAAMAuQAAAGcDAAAAAA==",
  "base64"
);

describe("office ingestion", () => {
  beforeEach(() => {
    safeRemoteFetchMock.mockReset();
  });

  it("parses DOCX runs from xmldom NodeLists", async () => {
    safeRemoteFetchMock.mockResolvedValue(
      new Response(DOCX_FIXTURE, {
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        status: 200,
      })
    );

    const resource = await ingestOfficeDocument({
      source: "allocation-memo.docx",
      title: "Quarterly Allocation Memo",
      url: "https://benchmark.invalid/allocation-memo.docx",
    });

    expect(resource.provider).toBe("officeparser:docx");
    expect(resource.chunks.map((chunk) => chunk.content).join(" ")).toContain(
      "The approved allocation identifier is ALPHA-27."
    );
    expect(resource.metadata).toEqual({ fileType: "docx", parserWarnings: 0 });
  });
});
