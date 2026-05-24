"use client";

export interface WidgetRendererProps {
  className?: string;
  html: string;
  isStreaming?: boolean;
  onOpenLink?: (url: string) => void;
  onSendMessage?: (text: string) => void;
  runScripts?: boolean;
}
