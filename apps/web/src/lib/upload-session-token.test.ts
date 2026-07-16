import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createUploadSessionPartToken,
  verifyUploadSessionPartToken,
} from "./upload-session-token";

const previousSecret = process.env.UPLOAD_SESSION_TOKEN_SECRET;

beforeEach(() => {
  process.env.UPLOAD_SESSION_TOKEN_SECRET = "test-upload-capability-secret";
});

afterEach(() => {
  vi.useRealTimers();
  process.env.UPLOAD_SESSION_TOKEN_SECRET = previousSecret;
});

describe("upload part capabilities", () => {
  it("binds the opaque capability to owner, workspace, session, and part", () => {
    const token = createUploadSessionPartToken({
      userId: "user-1",
      workspaceUuid: "workspace-1",
      sessionId: "session-1",
      partNumber: 2,
    });
    expect(verifyUploadSessionPartToken(token, {
      userId: "user-1",
      workspaceUuid: "workspace-1",
      sessionId: "session-1",
      partNumber: 2,
    }).ok).toBe(true);
    expect(verifyUploadSessionPartToken(token, {
      userId: "user-2",
      workspaceUuid: "workspace-1",
      sessionId: "session-1",
      partNumber: 2,
    })).toMatchObject({ ok: false, reason: "user" });
    expect(verifyUploadSessionPartToken(token, {
      userId: "user-1",
      workspaceUuid: "workspace-2",
      sessionId: "session-1",
      partNumber: 2,
    })).toMatchObject({ ok: false, reason: "workspace" });
  });

  it("rejects expired capabilities", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T00:00:00Z"));
    const token = createUploadSessionPartToken({
      userId: "user-1",
      workspaceUuid: "workspace-1",
      sessionId: "session-1",
      partNumber: 1,
      ttlSeconds: 1,
    });
    vi.advanceTimersByTime(1_000);
    expect(verifyUploadSessionPartToken(token, {
      userId: "user-1",
      workspaceUuid: "workspace-1",
      sessionId: "session-1",
      partNumber: 1,
    })).toMatchObject({ ok: false, reason: "expired" });
  });
});
