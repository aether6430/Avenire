import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureWorkspaceAccessForUserMock,
  getSessionUserMock,
  transcriptionModelMock,
  transcribeMock,
} = vi.hoisted(() => ({
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  transcriptionModelMock: vi.fn(),
  transcribeMock: vi.fn(),
}));

vi.mock("@avenire/ai", () => ({
  apollo: {
    transcriptionModel: transcriptionModelMock,
  },
  experimental_transcribe: transcribeMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { POST } from "./route";

describe("/api/transcriptions route", () => {
  beforeEach(() => {
    ensureWorkspaceAccessForUserMock.mockReset();
    getSessionUserMock.mockReset();
    transcriptionModelMock.mockReset();
    transcribeMock.mockReset();

    transcriptionModelMock.mockReturnValue("apollo-transcript-model");
  });

  it("returns unauthorized when there is no session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/transcriptions", {
        method: "POST",
        body: new FormData(),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns invalid form data when the request payload cannot be parsed", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    const request = {
      formData: vi.fn().mockRejectedValue(new Error("bad form")),
    } as unknown as Request;

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid form data",
    });
  });

  it("rejects missing workspace ids, forbidden access, and invalid audio blobs", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    let formData = new FormData();
    formData.append("audio", new Blob(["voice"]), "voice.webm");
    let response = await POST(
      new Request("http://localhost:3003/api/transcriptions", {
        method: "POST",
        body: formData,
      })
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing workspaceUuid",
    });

    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);
    formData = new FormData();
    formData.append("workspaceUuid", "  workspace-1  ");
    formData.append("audio", new Blob(["voice"]), "voice.webm");
    response = await POST(
      new Request("http://localhost:3003/api/transcriptions", {
        method: "POST",
        body: formData,
      })
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(ensureWorkspaceAccessForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1"
    );

    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    formData = new FormData();
    formData.append("workspaceUuid", "workspace-1");
    formData.append("audio", "not-a-blob");
    response = await POST(
      new Request("http://localhost:3003/api/transcriptions", {
        method: "POST",
        body: formData,
      })
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing audio blob",
    });
  });

  it("rejects empty or oversized audio payloads", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    let formData = new FormData();
    formData.append("workspaceUuid", "workspace-1");
    formData.append("audio", new Blob([]), "voice.webm");
    let response = await POST(
      new Request("http://localhost:3003/api/transcriptions", {
        method: "POST",
        body: formData,
      })
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Audio payload is empty or too large",
    });

    formData = new FormData();
    formData.append("workspaceUuid", "workspace-1");
    formData.append(
      "audio",
      new Blob([new Uint8Array(25 * 1024 * 1024 + 1)]),
      "voice.webm"
    );
    response = await POST(
      new Request("http://localhost:3003/api/transcriptions", {
        method: "POST",
        body: formData,
      })
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Audio payload is empty or too large",
    });
  });

  it("transcribes audio and returns filtered segments", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    transcribeMock.mockResolvedValue({
      segments: [
        {
          endSecond: 1.25,
          startSecond: 0.5,
          text: " First segment ",
        },
        {
          endSecond: 2,
          startSecond: 1.5,
          text: "   ",
        },
      ],
      text: "  Transcript body  ",
    });

    const formData = new FormData();
    formData.append("workspaceUuid", "  workspace-1  ");
    formData.append("audio", new Blob(["voice"]), "voice.webm");

    const response = await POST(
      new Request("http://localhost:3003/api/transcriptions", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      segments: [
        {
          endMs: 1250,
          startMs: 500,
          text: " First segment ",
        },
      ],
      text: "Transcript body",
    });
    expect(transcriptionModelMock).toHaveBeenCalledWith("apollo-transcript");
    expect(transcribeMock).toHaveBeenCalledTimes(1);
    expect(transcribeMock.mock.calls[0]?.[0]).toMatchObject({
      model: "apollo-transcript-model",
      providerOptions: {
        groq: {
          responseFormat: "verbose_json",
          timestampGranularities: ["segment"],
        },
      },
    });
    expect(transcribeMock.mock.calls[0]?.[0].audio).toBeInstanceOf(Uint8Array);
  });

  it("maps transcription failures to a stable 500 response", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    transcribeMock.mockRejectedValue(new Error("Groq unavailable"));

    const formData = new FormData();
    formData.append("workspaceUuid", "workspace-1");
    formData.append("audio", new Blob(["voice"]), "voice.webm");

    const response = await POST(
      new Request("http://localhost:3003/api/transcriptions", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Groq unavailable",
    });
  });
});
