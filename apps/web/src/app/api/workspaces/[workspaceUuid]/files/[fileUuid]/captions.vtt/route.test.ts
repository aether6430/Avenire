import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureWorkspaceAccessForUserMock,
  getSessionUserMock,
  listFileTranscriptCuesMock,
} = vi.hoisted(() => ({
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  listFileTranscriptCuesMock: vi.fn(),
}));

vi.mock("@/lib/ingestion-data", () => ({
  listFileTranscriptCues: listFileTranscriptCuesMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { GET } from "./route";

describe("/api/workspaces/[workspaceUuid]/files/[fileUuid]/captions.vtt route", () => {
  beforeEach(() => {
    ensureWorkspaceAccessForUserMock.mockReset();
    getSessionUserMock.mockReset();
    listFileTranscriptCuesMock.mockReset();
  });

  it("returns unauthorized without a session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({
        fileUuid: "file-1",
        workspaceUuid: "workspace-1",
      }),
    });

    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toBe("Unauthorized");
  });

  it("returns forbidden when the user cannot access the workspace", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({
        fileUuid: "file-1",
        workspaceUuid: "workspace-1",
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe("Forbidden");
  });

  it("returns an empty WEBVTT payload when there are no cues", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    listFileTranscriptCuesMock.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({
        fileUuid: " file-1 ",
        workspaceUuid: " workspace-1 ",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/vtt; charset=utf-8"
    );
    await expect(response.text()).resolves.toBe("WEBVTT\n\n");
    expect(ensureWorkspaceAccessForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1"
    );
    expect(listFileTranscriptCuesMock).toHaveBeenCalledWith(
      "workspace-1",
      "file-1"
    );
  });

  it("formats transcript cues into a VTT payload", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    listFileTranscriptCuesMock.mockResolvedValue([
      {
        endMs: 200,
        startMs: 10,
        text: "  Hello\r\nworld  ",
      },
    ]);

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({
        fileUuid: "file-1",
        workspaceUuid: "workspace-1",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      "WEBVTT\n\n1\n00:00:00.010 --> 00:00:00.510\nHello \nworld\n"
    );
  });

  it("maps caption loading failures to a stable 500 response", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    listFileTranscriptCuesMock.mockRejectedValue(new Error("storage offline"));

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({
        fileUuid: "file-1",
        workspaceUuid: "workspace-1",
      }),
    });

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe("Unable to load captions.");
  });
});
