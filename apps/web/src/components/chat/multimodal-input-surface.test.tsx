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

import { MultimodalInputSurface } from "@/components/chat/multimodal-input-surface";

describe("MultimodalInputSurface", () => {
  it("coordinates the local attachment and mention owners while preserving the upstream composer control contract", () => {
    const runtime = {
      attachments: [{ id: "att-1" }],
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
  });
});
