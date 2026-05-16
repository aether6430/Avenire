import type { Attachment } from "@/components/chat/attachment";

export interface PreviewAttachmentShellProps {
  attachment: Partial<Attachment>;
  onRemove?: (attachmentId: string) => void;
  workspaceUuid?: string;
}
