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
export const MAX_TEACHING_ARTIFACT_CONTENT_CHARS = 100_000;

function isTeachingArtifactKind(value: string): value is TeachingArtifactKind {
  return (TEACHING_ARTIFACT_KINDS as readonly string[]).includes(value);
}

export interface TeachingArtifactRecord {
  content: string;
  createdAt: string;
  id: string;
  kind: TeachingArtifactKind;
  slug: string;
  title: string;
  updatedAt: string;
}

export type TeachingArtifactMetadata = Omit<
  TeachingArtifactRecord,
  "content"
>;

function toMetadata(
  row: typeof teachingArtifact.$inferSelect
): TeachingArtifactMetadata {
  if (!isTeachingArtifactKind(row.kind)) {
    throw new Error(`Unsupported teaching artifact kind: ${row.kind}`);
  }

  return {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRecord(row: typeof teachingArtifact.$inferSelect): TeachingArtifactRecord {
  const metadata = toMetadata(row);
  return {
    content: row.content,
    ...metadata,
  };
}

/** List bounded teaching metadata without loading lesson or reference bodies. */
export async function getTeachingArtifacts(input: {
  kind?: TeachingArtifactKind;
  limit?: number;
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
      )
    )
    .orderBy(asc(teachingArtifact.kind), desc(teachingArtifact.updatedAt))
    .limit(input.limit ?? 50);

  const [missionRow] = await db
    .select()
    .from(teachingArtifact)
    .where(
      and(
        eq(teachingArtifact.kind, "mission"),
        eq(teachingArtifact.userId, input.userId),
        eq(teachingArtifact.workspaceId, input.workspaceId)
      )
    )
    .orderBy(desc(teachingArtifact.updatedAt))
    .limit(1);

  const artifacts = rows.map(toMetadata);
  return {
    artifacts,
    mission: missionRow ? toMetadata(missionRow) : null,
  };
}

/** Read one teaching artifact body after metadata identifies the target. */
export async function readTeachingArtifact(input: {
  kind: TeachingArtifactKind;
  slug: string;
  userId: string;
  workspaceId: string;
}) {
  const [row] = await db
    .select()
    .from(teachingArtifact)
    .where(
      and(
        eq(teachingArtifact.kind, input.kind),
        eq(teachingArtifact.slug, input.slug),
        eq(teachingArtifact.userId, input.userId),
        eq(teachingArtifact.workspaceId, input.workspaceId)
      )
    )
    .limit(1);

  if (!row) {
    throw new Error("Teaching artifact not found.");
  }

  return toRecord(row);
}

/** Save a bounded teaching artifact using the caller's user and workspace scope. */
export async function saveTeachingArtifact(input: {
  content: string;
  kind: TeachingArtifactKind;
  slug: string;
  title: string;
  userId: string;
  workspaceId: string;
}) {
  if (!isTeachingArtifactKind(input.kind)) {
    throw new Error(`Unsupported teaching artifact kind: ${input.kind}`);
  }
  if (input.content.length > MAX_TEACHING_ARTIFACT_CONTENT_CHARS) {
    throw new Error(
      `Teaching artifact content must be ${MAX_TEACHING_ARTIFACT_CONTENT_CHARS} characters or fewer.`
    );
  }

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
