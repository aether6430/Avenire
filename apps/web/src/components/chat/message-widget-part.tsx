"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "@avenire/ai/message-types";
import { Button } from "@avenire/ui/components/button";
import { PlusCircle } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import type {
  MessageWidgetInsertionPayload,
  ToolPart,
} from "@/components/chat/message-model";
import { isRenderableWidgetSpec } from "@/components/chat/message-model";

const WidgetPrimitiveRenderer = dynamic(
  () =>
    import("@/components/WidgetPrimitiveRenderer").then(
      (module) => module.WidgetPrimitiveRenderer
    ),
  { ssr: false }
);

const WidgetRenderer = dynamic(
  () =>
    import("@/components/WidgetRenderer").then(
      (module) => module.WidgetRenderer
    ),
  { ssr: false }
);

export function MessageWidgetPart({
  openNoteInsertDialog,
  part,
  sendMessage,
}: {
  openNoteInsertDialog: (payload: MessageWidgetInsertionPayload) => void;
  part: ToolPart;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
}) {
  const input = (part as { input?: Record<string, unknown> }).input;
  const output = (part as { output?: Record<string, unknown> }).output;
  const widgetCode =
    typeof input?.widget_code === "string"
      ? input.widget_code
      : typeof output?.widget_code === "string"
        ? output.widget_code
        : "";
  const widgetSpec = isRenderableWidgetSpec(input?.widget_spec)
    ? input.widget_spec
    : isRenderableWidgetSpec(output?.widget_spec)
      ? output.widget_spec
      : null;
  const title =
    typeof input?.title === "string"
      ? input.title
      : typeof output?.details === "object" &&
          output.details !== null &&
          typeof (output.details as { title?: unknown }).title === "string"
        ? (output.details as { title: string }).title
        : null;
  const loadingMessages = Array.isArray(input?.loading_messages)
    ? input.loading_messages.filter((message) => typeof message === "string")
    : [];
  const loadingMessage = loadingMessages.at(0) ?? "loading...";
  const isStreamingWidget = part.state === "input-streaming";
  const runScripts = !isStreamingWidget;

  return (
    <div className="mb-2 space-y-2">
      <div className="flex items-center justify-between text-[11px] text-foreground/28 uppercase tracking-[0.14em]">
        <span>Widget</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-foreground/28 normal-case tracking-normal">
            {title ?? "interactive"}
          </span>
          {widgetCode && !isStreamingWidget ? (
            <Button
              className="h-7 rounded-full px-3 text-[11px]"
              onClick={() => {
                openNoteInsertDialog({
                  html: widgetCode,
                  title,
                });
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <PlusCircle className="mr-1 size-3.5" />
              Add to note
            </Button>
          ) : null}
        </div>
      </div>
      {widgetSpec ? (
        <WidgetPrimitiveRenderer spec={widgetSpec} />
      ) : widgetCode ? (
        <WidgetRenderer
          html={widgetCode}
          isStreaming={isStreamingWidget}
          onOpenLink={(url) => {
            window.open(url, "_blank");
          }}
          onSendMessage={(text) => {
            sendMessage({ text });
          }}
          runScripts={runScripts}
        />
      ) : (
        <span className="font-mono text-[11px] text-foreground/28">
          {loadingMessage}
        </span>
      )}
    </div>
  );
}
