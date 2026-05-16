import { getWorkspaceTreePayload } from "@/lib/workspace-tree-client";
import { buildWorkspaceTreeFileIndex } from "@/lib/workspace-tree-read-model";

const MAX_MENTION_RESULTS = 20;
const WHITESPACE_REGEX = /\s/;

interface WorkspaceTreeFile {
  folderId: string;
  id: string;
  mimeType?: string | null;
  name: string;
  sizeBytes?: number;
  storageUrl: string;
}

export interface MentionableWorkspaceFile {
  contentType: string;
  id: string;
  name: string;
  nameLower: string;
  parentPath: string;
  pathLower: string;
  sizeBytes?: number;
  url: string;
  workspacePath: string;
}

export interface MentionTrigger {
  query: string;
  rangeEnd: number;
  rangeStart: number;
}

export async function loadWorkspaceMentionFiles(input: {
  signal: AbortSignal;
  workspaceUuid: string;
}): Promise<MentionableWorkspaceFile[]> {
  const payload = await getWorkspaceTreePayload<
    {
      id: string;
      name: string;
      parentId: string | null;
    },
    WorkspaceTreeFile
  >(input.workspaceUuid, {
    preferCache: true,
  }).catch(() => null);
  if (!payload || input.signal.aborted) {
    return [];
  }

  return buildWorkspaceTreeFileIndex(payload).flatMap(
    ({ file, parentPath, workspacePath }) => {
      if (!(file.id && file.name && file.storageUrl)) {
        return [];
      }

      return [
        {
          contentType: file.mimeType || "application/octet-stream",
          id: file.id,
          name: file.name,
          nameLower: file.name.toLowerCase(),
          parentPath,
          pathLower: workspacePath.toLowerCase(),
          sizeBytes: file.sizeBytes,
          url: file.storageUrl,
          workspacePath,
        } satisfies MentionableWorkspaceFile,
      ];
    }
  );
}

export function getMentionTrigger(
  text: string,
  selectionStart: number,
  selectionEnd: number
): MentionTrigger | null {
  if (selectionStart !== selectionEnd) {
    return null;
  }

  let rangeStart = selectionStart;
  while (rangeStart > 0 && !WHITESPACE_REGEX.test(text[rangeStart - 1] ?? "")) {
    rangeStart -= 1;
  }

  if (text[rangeStart] !== "@") {
    return null;
  }

  let rangeEnd = selectionStart;
  while (
    rangeEnd < text.length &&
    !WHITESPACE_REGEX.test(text[rangeEnd] ?? "")
  ) {
    rangeEnd += 1;
  }

  return {
    query: text.slice(rangeStart + 1, selectionStart),
    rangeEnd,
    rangeStart,
  };
}

export function getWorkspaceMentionSuggestions(input: {
  files: MentionableWorkspaceFile[];
  query: string;
  trigger: MentionTrigger | null;
}) {
  if (!input.trigger) {
    return [];
  }

  const query = input.query.trim().toLowerCase();
  const ranked = input.files
    .flatMap((file) => {
      if (!query) {
        return [{ file, rank: 4 }];
      }

      const nameStartsWith = file.nameLower.startsWith(query);
      const pathStartsWith = file.pathLower.startsWith(query);
      const nameIncludes = file.nameLower.includes(query);
      const pathIncludes = file.pathLower.includes(query);

      if (!(nameStartsWith || pathStartsWith || nameIncludes || pathIncludes)) {
        return [];
      }

      let rank = 3;
      if (nameStartsWith) {
        rank = 0;
      } else if (pathStartsWith) {
        rank = 1;
      } else if (nameIncludes) {
        rank = 2;
      }

      return [{ file, rank }];
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.file.workspacePath.localeCompare(b.file.workspacePath, undefined, {
          sensitivity: "base",
        })
    );

  return ranked.slice(0, MAX_MENTION_RESULTS).map((entry) => entry.file);
}
