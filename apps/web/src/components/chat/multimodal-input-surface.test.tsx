import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  MultimodalInputAttachmentStripMock,
  MultimodalInputComposerControlsMock,
  MultimodalInputMentionMenuMock,
} = vi.hoisted(() => ({
  MultimodalInputAttachmentStripMock: vi.fn(() => <div>ATTACHMENT_STRIP</div>),
  MultimodalInputComposerControlsMock: vi.fn(() => (
    <div>COMPOSER_CONTROLS</div>
  )),
  MultimodalInputMentionMenuMock: vi.fn(() => <div>MENTION_MENU</div>),
}));

vi.mock("@/components/chat/multimodal-input-attachment-strip", () => ({
  MultimodalInputAttachmentStrip: MultimodalInputAttachmentStripMock,
}));

vi.mock("@/components/chat/multimodal-input-composer-controls", () => ({
  MultimodalInputComposerControls: MultimodalInputComposerControlsMock,
}));

vi.mock("@/components/chat/multimodal-input-mention-menu", () => ({
  MultimodalInputMentionMenu: MultimodalInputMentionMenuMock,
}));

import { MultimodalInputSurface } from "@/components/chat/multimodal-input-surface";

describe("MultimodalInputSurface", () => {
  it("coordinates the local attachment, mention, and composer owners", () => {
    const runtime = {
      attachments: [{ id: "att-1" }],
      canSend: true,
      fileInputRef: { current: null },
      handleFileChange: () => {},
      isRunning: false,
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
    expect(MultimodalInputComposerControlsMock).toHaveBeenCalledWith(
      { runtime },
      undefined
    );
    expect(html).toContain("ATTACHMENT_STRIP");
    expect(html).toContain("MENTION_MENU");
    expect(html).toContain("COMPOSER_CONTROLS");
  });
});
