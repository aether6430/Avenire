export interface SelectionControlCaptureProps {
  onClickCapture: React.MouseEventHandler<HTMLElement>;
  onMouseDownCapture: React.MouseEventHandler<HTMLElement>;
  onPointerDownCapture: React.PointerEventHandler<HTMLElement>;
}

export type ExplorerCardFileType =
  | "archive"
  | "audio"
  | "code"
  | "document"
  | "image"
  | "other"
  | "sheet"
  | "video";
