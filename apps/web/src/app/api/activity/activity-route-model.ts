export type ActivityType = "chat" | "file" | "note";
export type ActivityAction = "created" | "updated";

export interface ActivityEvent {
  action: ActivityAction;
  createdAt: string;
  href: string;
  id: string;
  subtitle?: string;
  title: string;
  type: ActivityType;
}

const DEFAULT_ACTIVITY_LIMIT = 10;
const MAX_ACTIVITY_LIMIT = 50;

export function resolveActivityRouteLimit(limitRaw: string | null) {
  const parsed = Number.parseInt(limitRaw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ACTIVITY_LIMIT;
  }

  return Math.min(parsed, MAX_ACTIVITY_LIMIT);
}

export function buildActivityChatEvent(input: {
  createdAt: string;
  id: string;
  slug: string;
  title: string;
  updatedAt: string;
}): ActivityEvent {
  return {
    id: `chat-${input.id}`,
    type: "chat",
    action: input.createdAt === input.updatedAt ? "created" : "updated",
    title: input.title,
    href: `/workspace/chats/${input.slug}`,
    createdAt: input.updatedAt,
  };
}

export function buildActivityFileEvent(input: {
  createdAt: string;
  folderId: string;
  id: string;
  isNote?: boolean;
  name: string;
  updatedAt: string;
  workspaceId: string;
}): ActivityEvent {
  return {
    id: `file-${input.id}`,
    type: input.isNote ? "note" : "file",
    action: input.createdAt === input.updatedAt ? "created" : "updated",
    title: input.name,
    href: `/workspace/files/${input.workspaceId}/folder/${input.folderId}?file=${input.id}`,
    createdAt: input.updatedAt,
  };
}

export function sortActivityEvents(events: ActivityEvent[]) {
  return [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
