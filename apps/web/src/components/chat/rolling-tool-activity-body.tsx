"use client";

import type {
  ActionGroup,
  ActivityAction,
  ToolPart,
} from "@/components/chat/rolling-tool-activity-types";
import { ExploreBlock } from "./rolling-tool-activity-explore-block";
import {
  groupRollingToolActions,
  toRollingToolAction,
} from "./rolling-tool-activity-model";
import { MutationBlock } from "./rolling-tool-activity-mutation-block";
import {
  buildOccurrenceKeys,
  getExploreItemSignature,
} from "./rolling-tool-activity-shared";

function isGroupDone(
  groups: ActionGroup[],
  groupIndex: number,
  isStreaming: boolean
) {
  const group = groups[groupIndex];
  if (!group || group.type !== "explore") {
    return true;
  }

  if (!group.items.some((item) => item.action.pending)) {
    return true;
  }

  const isLastGroup = groupIndex === groups.length - 1;
  return !(isLastGroup && isStreaming);
}

export function RollingToolActivityBody({
  groups,
  isStreaming,
  keyPrefix,
}: {
  groups: ActionGroup[];
  isStreaming: boolean;
  keyPrefix: string;
}) {
  if (groups.length === 0) {
    return null;
  }

  const groupKeys = buildOccurrenceKeys(groups, (group) =>
    group.type === "explore"
      ? `${keyPrefix}-explore-${getExploreItemSignature(group.items)}`
      : `${keyPrefix}-mutation-${JSON.stringify(group.action)}`
  );

  return (
    <div aria-label="Agent activity" className="mb-0.5 font-mono" role="list">
      {groups.map((group, index) => {
        if (group.type === "explore") {
          return (
            <ExploreBlock
              done={isGroupDone(groups, index, isStreaming)}
              items={group.items}
              key={groupKeys[index]}
            />
          );
        }

        return <MutationBlock action={group.action} key={groupKeys[index]} />;
      })}
    </div>
  );
}

export function RollingAgentActivity({
  actions,
  isStreaming,
}: {
  actions: ActivityAction[];
  isStreaming: boolean;
}) {
  const groups = groupRollingToolActions(actions);

  return (
    <RollingToolActivityBody
      groups={groups}
      isStreaming={isStreaming}
      keyPrefix="agent"
    />
  );
}

export function RollingToolActivity({
  isStreaming,
  parts,
}: {
  isStreaming: boolean;
  parts: ToolPart[];
}) {
  const actions = parts
    .map((part) => toRollingToolAction(part))
    .filter((part) => part !== null);
  const groups = groupRollingToolActions(actions);

  return (
    <RollingToolActivityBody
      groups={groups}
      isStreaming={isStreaming}
      keyPrefix="tool"
    />
  );
}
