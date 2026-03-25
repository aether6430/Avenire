import { randomUUID } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "./client";
import { user, waitlist } from "./auth-schema";

export type WaitlistStatus = "pending" | "approved" | "registered";
export type WaitlistAccessState = WaitlistStatus | "none";

export interface WaitlistEntry {
  id: string;
  email: string;
  status: WaitlistStatus;
  requestedAt: Date;
  processedAt: Date | null;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapWaitlistEntry(entry: {
  id: string;
  email: string;
  status: string;
  requestedAt: Date;
  processedAt: Date | null;
}): WaitlistEntry {
  return {
    id: entry.id,
    email: entry.email,
    status:
      entry.status === "registered"
        ? "registered"
        : entry.status === "approved"
          ? "approved"
          : "pending",
    requestedAt: entry.requestedAt,
    processedAt: entry.processedAt,
  };
}

export async function listWaitlistEntries(options?: {
  status?: WaitlistStatus | WaitlistStatus[];
  limit?: number;
}) {
  const statuses = options?.status
    ? Array.isArray(options.status)
      ? options.status
      : [options.status]
    : null;
  const limit = options?.limit ?? 100;

  const rows = await db
    .select({
      id: waitlist.id,
      email: waitlist.email,
      status: waitlist.status,
      requestedAt: waitlist.requestedAt,
      processedAt: waitlist.processedAt,
    })
    .from(waitlist)
    .where(statuses ? inArray(waitlist.status, statuses) : undefined)
    .orderBy(desc(waitlist.requestedAt))
    .limit(limit);

  return rows.map(mapWaitlistEntry);
}

export async function getWaitlistEntryByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const [entry] = await db
    .select({
      id: waitlist.id,
      email: waitlist.email,
      status: waitlist.status,
      requestedAt: waitlist.requestedAt,
      processedAt: waitlist.processedAt,
    })
    .from(waitlist)
    .where(eq(waitlist.email, normalizedEmail))
    .limit(1);

  return entry ? mapWaitlistEntry(entry) : null;
}

export async function getWaitlistStatusByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const entry = await getWaitlistEntryByEmail(normalizedEmail);
  return entry?.status ?? null;
}

export function hasWaitlistAccess(
  status: WaitlistStatus | WaitlistAccessState | null | undefined,
) {
  return status === "approved" || status === "registered";
}

export async function getWaitlistAccessStateByEmail(
  email: string,
): Promise<WaitlistAccessState> {
  const status = await getWaitlistStatusByEmail(email);
  return status ?? "none";
}

export async function getWaitlistAccessStateByUserId(
  userId: string,
): Promise<WaitlistAccessState> {
  const [row] = await db
    .select({
      email: user.email,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row?.email) {
    return "none";
  }

  return getWaitlistAccessStateByEmail(row.email);
}

export async function requestWaitlistEntry(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const [entry] = await db
    .insert(waitlist)
    .values({
      id: randomUUID(),
      email: normalizedEmail,
      status: "pending",
      requestedAt: now,
      processedAt: null,
    })
    .onConflictDoUpdate({
      target: waitlist.email,
      set: {
        requestedAt: now,
      },
    })
    .returning({
      id: waitlist.id,
      email: waitlist.email,
      status: waitlist.status,
      requestedAt: waitlist.requestedAt,
      processedAt: waitlist.processedAt,
    });

  return mapWaitlistEntry(entry);
}

export async function approveWaitlistEntry(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await getWaitlistEntryByEmail(normalizedEmail);
  const now = new Date();

  if (existing?.status === "registered") {
    return existing;
  }

  const [entry] = await db
    .insert(waitlist)
    .values({
      id: randomUUID(),
      email: normalizedEmail,
      status: "approved",
      requestedAt: existing?.requestedAt ?? now,
      processedAt: now,
    })
    .onConflictDoUpdate({
      target: waitlist.email,
      set: {
        status: "approved",
        processedAt: now,
      },
    })
    .returning({
      id: waitlist.id,
      email: waitlist.email,
      status: waitlist.status,
      requestedAt: waitlist.requestedAt,
      processedAt: waitlist.processedAt,
    });

  return mapWaitlistEntry(entry);
}

export async function markWaitlistRegistered(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const [entry] = await db
    .insert(waitlist)
    .values({
      id: randomUUID(),
      email: normalizedEmail,
      status: "registered",
      requestedAt: now,
      processedAt: now,
    })
    .onConflictDoUpdate({
      target: waitlist.email,
      set: {
        status: "registered",
        processedAt: now,
      },
    })
    .returning({
      id: waitlist.id,
      email: waitlist.email,
      status: waitlist.status,
      requestedAt: waitlist.requestedAt,
      processedAt: waitlist.processedAt,
    });

  return mapWaitlistEntry(entry);
}
