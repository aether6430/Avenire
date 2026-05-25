import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { MultimodalInputAttachmentStripMock, MultimodalInputMentionMenuMock } =
  vi.hoisted(() => ({
    MultimodalInputAttachmentStripMock: vi.fn(() => (
      <div>ATTACHMENT_STRIP</div>
    )),
    MultimodalInputMentionMenuMock: vi.fn(() => <div>MENTION_MENU</div>),
  }));

vi.mock("@/components/chat/multimodal-input-attachment-strip", () => ({
  MultimodalInputAttachmentStrip: MultimodalInputAttachmentStripMock,
}));

vi.mock("@/components/chat/multimodal-input-mention-menu", () => ({
  MultimodalInputMentionMenu: MultimodalInputMentionMenuMock,
}));

import { MultimodalInputSurface } from "@/components/chat/multimodal-input";

const composerControlsSource = readFileSync(
  resolve(import.meta.dirname, "./multimodal-input-composer-controls.tsx"),
  "utf8"
);
const multimodalInputSource = readFileSync(
  resolve(import.meta.dirname, "./multimodal-input.tsx"),
  "utf8"
);

describe("MultimodalInputSurface", () => {
  it("coordinates the local attachment and mention owners while preserving the upstream composer control contract", () => {
    const runtime = {
      attachments: [{ id: "att-1" }],
      autoFocusEnabled: true,
      canSend: true,
      className: "",
      fileInputRef: { current: null },
      handleTextareaChange: () => {},
      handleTextareaClick: () => {},
      handleTextareaKeyDown: () => {},
      handleTextareaPaste: () => {},
      handleTextareaSelect: () => {},
      handleFileChange: () => {},
      input: "",
      isMobile: false,
      isRecording: false,
      isRunning: false,
      isTranscribing: false,
      onTurboChange: () => {},
      placeholder: "What do you want to learn?",
      runSubmitForm: () => {},
      speechSupported: true,
      startOrStopRecording: () => {},
      status: "ready",
      stop: () => {},
      textareaRef: { current: null },
      turboAvailable: true,
      turboEnabled: false,
    };

    const html = renderToStaticMarkup(
      <MultimodalInputSurface runtime={runtime as never} />
    );

    expect(MultimodalInputAttachmentStripMock).toHaveBeenCalledWith(
      {
        attachments: runtime.attachments,
        runtime,
      },
      undefined
    );
    expect(MultimodalInputMentionMenuMock).toHaveBeenCalledWith(
      { runtime },
      undefined
    );
    expect(html).toContain("ATTACHMENT_STRIP");
    expect(html).toContain("MENTION_MENU");
    expect(html).toContain('aria-label="Add attachment"');
    expect(html).toContain('aria-label="Start voice input"');
    expect(html).toContain('data-testid="turbo-toggle-button"');
    expect(html.indexOf('data-testid="turbo-toggle-button"')).toBeLessThan(
      html.indexOf('aria-label="Start voice input"')
    );
    expect(multimodalInputSource).not.toContain(
      "@/components/chat/multimodal-input-surface"
    );
  });

  it("omits the turbo toggle when Apex Turbo is not available in the current workspace bootstrap config", () => {
    const runtime = {
      attachments: [],
      autoFocusEnabled: false,
      canSend: true,
      className: "",
      fileInputRef: { current: null },
      handleFileChange: () => {},
      handleTextareaChange: () => {},
      handleTextareaClick: () => {},
      handleTextareaKeyDown: () => {},
      handleTextareaPaste: () => {},
      handleTextareaSelect: () => {},
      input: "",
      isMobile: false,
      isRecording: false,
      isRunning: false,
      isTranscribing: false,
      onTurboChange: () => {},
      placeholder: "What do you want to learn?",
      runSubmitForm: () => {},
      speechSupported: true,
      startOrStopRecording: () => {},
      status: "ready",
      stop: () => {},
      textareaRef: { current: null },
      turboAvailable: false,
      turboEnabled: false,
    };

    const html = renderToStaticMarkup(
      <MultimodalInputSurface runtime={runtime as never} />
    );

    expect(html).not.toContain('data-testid="turbo-toggle-button"');
    expect(html).toContain('aria-label="Start voice input"');
  });

  it("disables textarea autofocus on narrow mobile-sized surfaces even when pane state alone is not enough", () => {
    expect(composerControlsSource).toContain("autoFocus={autoFocusEnabled}");
    expect(composerControlsSource).toContain('"autoFocusEnabled"');
  });
});
