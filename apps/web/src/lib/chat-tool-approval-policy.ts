import type { UIMessage } from "@avenire/ai/message-types";

export const CHAT_TOOL_APPROVAL_POLICY = {
  delete_file: "user-approval",
  move_file: "user-approval",
} as const;

const APPROVAL_STATES = new Set(["approval-requested", "approval-responded"]);

export function requiresChatToolApproval(toolName: string) {
  return Object.hasOwn(CHAT_TOOL_APPROVAL_POLICY, toolName);
}

function getToolPartName(partType: string) {
  if (!partType.startsWith("tool-")) {
    return null;
  }

  return partType.slice("tool-".length);
}

export function stripUnconfiguredToolApprovalParts(messages: UIMessage[]) {
  let changed = false;

  const nextMessages = messages.map((message) => {
    let messageChanged = false;
    const nextParts = message.parts.flatMap(
      (part): typeof message.parts => {
        const toolName = getToolPartName(part.type);
        const state = "state" in part ? part.state : null;
        if (
          toolName &&
          APPROVAL_STATES.has(String(state)) &&
          !requiresChatToolApproval(toolName)
        ) {
          changed = true;
          messageChanged = true;
          return [];
        }

        return [part];
      }
    );

    if (!messageChanged) {
      return message;
    }

    return {
      ...message,
      parts: nextParts,
    };
  });

  return changed ? nextMessages : messages;
}
