import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./client";
import { teachingArtifact } from "./schema";

export const TEACHING_ARTIFACT_KINDS = [
  "mission",
  "resource",
  "note",
  "reference",
  "lesson",
  "learning-record",
] as const;

export type TeachingArtifactKind = (typeof TEACHING_ARTIFACT_KINDS)[number];

export interface TeachingArtifactRecord {
  content: string;
  createdAt: string;
  id: string;
  kind: TeachingArtifactKind;
  slug: string;
  title: string;
  updatedAt: string;
}

function toRecord(row: typeof teachingArtifact.$inferSelect): TeachingArtifactRecord {
  return {
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    kind: row.kind as TeachingArtifactKind,
    slug: row.slug,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getTeachingArtifacts(input: {
  kind?: TeachingArtifactKind;
  slug?: string;
  userId: string;
  workspaceId: string;
}) {
  const rows = await db
    .select()
    .from(teachingArtifact)
    .where(
      and(
        eq(teachingArtifact.userId, input.userId),
        eq(teachingArtifact.workspaceId, input.workspaceId),
        input.kind ? eq(teachingArtifact.kind, input.kind) : undefined,
        input.slug ? eq(teachingArtifact.slug, input.slug) : undefined
      )
    )
    .orderBy(asc(teachingArtifact.kind), desc(teachingArtifact.updatedAt));

  const artifacts = rows.map(toRecord);
  return {
    artifacts,
    mission:
      artifacts.find((artifact) => artifact.kind === "mission") ?? null,
  };
}

export async function saveTeachingArtifact(input: {
  content: string;
  kind: TeachingArtifactKind;
  slug: string;
  title: string;
  userId: string;
  workspaceId: string;
}) {
  const [row] = await db
    .insert(teachingArtifact)
    .values({
      content: input.content,
      kind: input.kind,
      slug: input.slug,
      title: input.title,
      userId: input.userId,
      workspaceId: input.workspaceId,
    })
    .onConflictDoUpdate({
      target: [
        teachingArtifact.userId,
        teachingArtifact.workspaceId,
        teachingArtifact.kind,
        teachingArtifact.slug,
      ],
      set: {
        content: input.content,
        title: input.title,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) {
    throw new Error("Teaching artifact was not saved.");
  }

  return toRecord(row);
}
