"use client";

import dynamic from "next/dynamic";
import type { ActivityAction } from "@/components/chat/rolling-tool-activity-types";
import {
  buildAgentActionsFromToolPart,
  HIDDEN_TOOL_TYPES,
  type ToolPart,
} from "@/components/chat/tool-part-model";
import { ChatToolPartSurface } from "@/components/chat/tool-part-surface";

export { ToolRow } from "@/components/chat/tool-part-shared";

const RollingAgentActivity = dynamic(
  () =>
    import("@/components/chat/rolling-tool-activity-surface").then(
      (module) => module.RollingAgentActivity
    ),
  { ssr: false }
);

export function ChatToolPart({ part }: { part: ToolPart }) {
  if (HIDDEN_TOOL_TYPES.has(part.type)) {
    return null;
  }

  if (
    part.type === "tool-avenire_agent" ||
    part.type === "tool-file_manager_agent"
  ) {
    const actions: ActivityAction[] = buildAgentActionsFromToolPart(part);
    if (actions.length === 0) {
      return null;
    }

    return (
      <RollingAgentActivity
        actions={actions}
        isStreaming={part.state !== "output-available"}
      />
    );
  }

  return <ChatToolPartSurface part={part} />;
}
