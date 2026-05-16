function buildWelcomeWorkspaceNote(input: {
  firstName?: string | null;
  workspaceName: string;
}) {
  const name = input.firstName?.trim() || "there";

  return `# Welcome to Avenire

Hi ${name},

I set up **${input.workspaceName}** for you. This is your starting point for the first study loop.

## Your first three moves

1. Upload a file so Avenire has something real to work from.
2. Generate a mindset set from that file so you can start reviewing it right away.
3. Ask a question about the file and use Apollo to explain the parts that still feel unclear.

## What to do next

- Keep adding files as you study.
- Revisit your mindset cards before they decay.
- Use Apollo when you want a deeper explanation instead of a shorter answer.

I left this note here so you always have a clean way to get started, ${name}.
`;
}

async function loadWorkspaceBootstrap() {
  const databaseModule = await import("@avenire/database");

  return {
    createWorkspaceForUser: databaseModule.createWorkspaceForUser,
    createWorkspaceNoteFile: databaseModule.createWorkspaceNoteFile,
  };
}

export async function provisionWelcomeWorkspaceForUser(input: {
  email: string;
  name?: string | null;
  userId: string;
}) {
  const { createWorkspaceForUser, createWorkspaceNoteFile } =
    await loadWorkspaceBootstrap();
  const workspaceNameBase =
    input.name ?? input.email.split("@")[0] ?? "workspace";
  const workspace = await createWorkspaceForUser(
    input.userId,
    `${workspaceNameBase}'s Workspace`
  );

  await createWorkspaceNoteFile({
    content: buildWelcomeWorkspaceNote({
      firstName: input.name,
      workspaceName: workspace.name,
    }),
    folderId: workspace.rootFolderId,
    name: "Welcome to Avenire.md",
    userId: input.userId,
    workspaceId: workspace.workspaceId,
  });
}
