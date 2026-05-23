import { NextResponse } from "next/server";
import { listChatsForUser } from "@/lib/chat-data";
import { listWorkspaceFiles, listWorkspaceFolders } from "@/lib/file-data";
import {
  buildWorkspaceTaskChatOption,
  buildWorkspaceTaskFileOption,
  buildWorkspaceTaskFolderOption,
  filterWorkspaceTaskResourceOptions,
  normalizeWorkspaceTaskResourcesQuery,
  resolveWorkspaceTaskResourcesRouteError,
  WORKSPACE_TASK_RESOURCES_LOAD_ERROR,
} from "./workspace-task-resources-route-model";

export async function handleWorkspaceTaskResourcesRouteGet(input: {
  request: Request;
  userId: string;
  workspaceUuid: string;
}) {
  try {
    const searchParams = new URL(input.request.url).searchParams;
    const query = normalizeWorkspaceTaskResourcesQuery(searchParams.get("q"));

    const [files, folders, chats] = await Promise.all([
      listWorkspaceFiles(input.workspaceUuid, input.userId),
      listWorkspaceFolders(input.workspaceUuid, input.userId),
      listChatsForUser(input.userId, input.workspaceUuid),
    ]);

    const options = filterWorkspaceTaskResourceOptions(
      [
        ...files.map((file) =>
          buildWorkspaceTaskFileOption(input.workspaceUuid, file)
        ),
        ...folders.map((folder) =>
          buildWorkspaceTaskFolderOption(input.workspaceUuid, folder)
        ),
        ...chats.map((chat) => buildWorkspaceTaskChatOption(chat)),
      ],
      query
    );

    return NextResponse.json({
      resources: options.slice(0, 100),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceTaskResourcesRouteError(
          error,
          WORKSPACE_TASK_RESOURCES_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
