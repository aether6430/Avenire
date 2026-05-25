import { randomUUID } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import { user } from "./auth-schema";
import { db } from "./client";
import {
  billingCustomer,
  billingSubscription,
  fileAsset,
  usageMeter,
} from "./schema";

export type BillingPlan = "access" | "core" | "scholar";
export type BillingFeature =
  | "fullWorkspaceSearch"
  | "apolloTutor"
  | "interactiveConceptWidgets"
  | "misconceptionDetection"
  | "spacedRepetitionFlashcards"
  | "priorityResponseQueue"
  | "masteryAnalytics"
  | "customStudyPlans"
  | "earlyExperimentalFeatures";
export type UsageMeterType = "chat";

interface MeterEntitlement {
  fourHourCapacity: number;
  overageCapacity: number;
}

interface PlanEntitlements {
  chat: MeterEntitlement;
  features: Record<BillingFeature, boolean>;
  responseSpeed: "standard" | "priority";
  storageBytes: number;
}

const FOUR_HOUR_MS = 4 * 60 * 60 * 1000;
const GIB = 1024 * 1024 * 1024;

const PLAN_ENTITLEMENTS: Record<BillingPlan, PlanEntitlements> = {
  access: {
    chat: { fourHourCapacity: 30, overageCapacity: 300 },
    features: {
      fullWorkspaceSearch: true,
      apolloTutor: true,
      interactiveConceptWidgets: true,
      misconceptionDetection: true,
      spacedRepetitionFlashcards: true,
      priorityResponseQueue: false,
      masteryAnalytics: false,
      customStudyPlans: false,
      earlyExperimentalFeatures: false,
    },
    responseSpeed: "standard",
    storageBytes: 2 * GIB,
  },
  core: {
    chat: { fourHourCapacity: 80, overageCapacity: 1800 },
    features: {
      fullWorkspaceSearch: true,
      apolloTutor: true,
      interactiveConceptWidgets: true,
      misconceptionDetection: true,
      spacedRepetitionFlashcards: true,
      priorityResponseQueue: true,
      masteryAnalytics: false,
      customStudyPlans: false,
      earlyExperimentalFeatures: false,
    },
    responseSpeed: "priority",
    storageBytes: 15 * GIB,
  },
  scholar: {
    chat: { fourHourCapacity: 180, overageCapacity: 6500 },
    features: {
      fullWorkspaceSearch: true,
      apolloTutor: true,
      interactiveConceptWidgets: true,
      misconceptionDetection: true,
      spacedRepetitionFlashcards: true,
      priorityResponseQueue: true,
      masteryAnalytics: true,
      customStudyPlans: true,
      earlyExperimentalFeatures: true,
    },
    responseSpeed: "priority",
    storageBytes: 50 * GIB,
  },
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const BILLING_TABLE_NAMES = [
  "billing_subscription",
  "billing_customer",
  "usage_meter",
];

function hasBillingTableName(input: string) {
  return BILLING_TABLE_NAMES.some((tableName) => input.includes(tableName));
}

function hasMissingRelationMessage(input: string) {
  return (
    input.includes("does not exist") ||
    input.includes("relation") ||
    input.includes("undefined_table")
  );
}

function hasFailedBillingTableQuery(input: string) {
  return input.includes("Failed query:") && hasBillingTableName(input);
}

function isMissingBillingTableError(error: unknown): boolean {
  const seen = new Set<unknown>();
  const stack: unknown[] = [error];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (typeof current === "object") {
      const record = current as Record<string, unknown>;
      if (
        record.code === "42P01" &&
        typeof record.message === "string" &&
        hasBillingTableName(record.message)
      ) {
        return true;
      }

      for (const key of ["message", "detail", "stack"]) {
        const value = record[key];
        if (
          typeof value === "string" &&
          ((hasBillingTableName(value) && hasMissingRelationMessage(value)) ||
            hasFailedBillingTableQuery(value))
        ) {
          return true;
        }
      }

      stack.push(record.cause);
    }
  }

  return false;
}

function clampToCapacity(value: number, capacity: number) {
  return Math.max(0, Math.min(value, capacity));
}

function recomputeRemainingFromConsumed(input: {
  previousBalance: number;
  previousCapacity: number;
  nextCapacity: number;
}) {
  const consumed = clampToCapacity(
    input.previousCapacity - input.previousBalance,
    input.previousCapacity
  );
  return clampToCapacity(input.nextCapacity - consumed, input.nextCapacity);
}

function toPlan(input?: string | null): BillingPlan {
  if (input === "core" || input === "scholar") {
    return input;
  }
  return "access";
}

function advanceFourHourWindow(input: {
  fourHourBalance: number;
  fourHourCapacity: number;
  fourHourRefillAt: Date;
  now: Date;
}) {
  if (input.now.getTime() < input.fourHourRefillAt.getTime()) {
    return {
      fourHourBalance: input.fourHourBalance,
      fourHourRefillAt: input.fourHourRefillAt,
      changed: false,
    };
  }

  const elapsedMs = input.now.getTime() - input.fourHourRefillAt.getTime();
  const windowsPassed = Math.floor(elapsedMs / FOUR_HOUR_MS) + 1;
  return {
    fourHourBalance: input.fourHourCapacity,
    fourHourRefillAt: new Date(
      input.fourHourRefillAt.getTime() + windowsPassed * FOUR_HOUR_MS
    ),
    changed: true,
  };
}

async function getUserPlan(userId: string): Promise<BillingPlan> {
  let subscription:
    | {
        status: string;
        plan: string;
      }
    | undefined;

  try {
    [subscription] = await db
      .select({
        status: billingSubscription.status,
        plan: billingSubscription.plan,
      })
      .from(billingSubscription)
      .where(eq(billingSubscription.userId, userId))
      .limit(1);
  } catch (error) {
    if (!isMissingBillingTableError(error)) {
      throw error;
    }
    return "access";
  }

  if (!subscription) {
    return "access";
  }

  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return "access";
  }

  return toPlan(subscription.plan);
}

export function getPlanEntitlements(plan: BillingPlan) {
  const entitlements = PLAN_ENTITLEMENTS[plan];
  return {
    chat: { ...entitlements.chat },
    features: { ...entitlements.features },
    responseSpeed: entitlements.responseSpeed,
    storageBytes: entitlements.storageBytes,
  };
}

export async function userHasBillingFeature(
  userId: string,
  feature: BillingFeature
) {
  const plan = await getUserPlan(userId);
  return PLAN_ENTITLEMENTS[plan].features[feature];
}

async function getOrCreateMeter(userId: string, meter: UsageMeterType) {
  const plan = await getUserPlan(userId);
  const entitlement = PLAN_ENTITLEMENTS[plan][meter];

  const now = new Date();
  await db
    .insert(usageMeter)
    .values({
      id: randomUUID(),
      userId,
      meter,
      fourHourCapacity: entitlement.fourHourCapacity,
      fourHourBalance: entitlement.fourHourCapacity,
      fourHourRefillAt: new Date(now.getTime() + FOUR_HOUR_MS),
      overageCapacity: entitlement.overageCapacity,
      overageBalance: entitlement.overageCapacity,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [usageMeter.userId, usageMeter.meter],
    });

  const [meterRow] = await db
    .select()
    .from(usageMeter)
    .where(and(eq(usageMeter.userId, userId), eq(usageMeter.meter, meter)))
    .limit(1);

  if (!meterRow) {
    throw new Error("usage meter row missing after create-or-get upsert");
  }

  return { meterRow, plan, entitlement };
}

export async function consumeUsageUnits(input: {
  userId: string;
  meter: UsageMeterType;
  units: number;
}) {
  const units = Math.max(0, Math.floor(input.units));
  if (units === 0) {
    return {
      ok: true as const,
      consumedFromFourHour: 0,
      consumedFromOverage: 0,
      retryAfter: null as Date | null,
    };
  }

  const now = new Date();

  try {
    return await db.transaction(async (tx) => {
      const plan = await getUserPlan(input.userId);
      const entitlement = PLAN_ENTITLEMENTS[plan][input.meter];

      const [existing] = await tx
        .select()
        .from(usageMeter)
        .where(
          and(
            eq(usageMeter.userId, input.userId),
            eq(usageMeter.meter, input.meter)
          )
        )
        .limit(1);

      const base = existing ?? {
        id: randomUUID(),
        userId: input.userId,
        meter: input.meter,
        fourHourCapacity: entitlement.fourHourCapacity,
        fourHourBalance: entitlement.fourHourCapacity,
        fourHourRefillAt: new Date(now.getTime() + FOUR_HOUR_MS),
        overageCapacity: entitlement.overageCapacity,
        overageBalance: entitlement.overageCapacity,
        createdAt: now,
        updatedAt: now,
      };

      const baselineFourHourBalance = recomputeRemainingFromConsumed({
        previousBalance: base.fourHourBalance,
        previousCapacity: base.fourHourCapacity,
        nextCapacity: entitlement.fourHourCapacity,
      });
      const reset = advanceFourHourWindow({
        fourHourBalance: baselineFourHourBalance,
        fourHourCapacity: entitlement.fourHourCapacity,
        fourHourRefillAt: base.fourHourRefillAt,
        now,
      });

      let nextFourHourBalance = reset.fourHourBalance;
      let nextOverageBalance = recomputeRemainingFromConsumed({
        previousBalance: base.overageBalance,
        previousCapacity: base.overageCapacity,
        nextCapacity: entitlement.overageCapacity,
      });

      const spendFourHour = Math.min(nextFourHourBalance, units);
      const remaining = units - spendFourHour;
      const spendOverage = Math.min(nextOverageBalance, remaining);

      if (spendFourHour + spendOverage < units) {
        if (!existing) {
          await tx.insert(usageMeter).values({
            ...base,
            fourHourBalance: nextFourHourBalance,
            fourHourRefillAt: reset.fourHourRefillAt,
            overageBalance: nextOverageBalance,
          });
        } else if (
          reset.changed ||
          base.fourHourCapacity !== entitlement.fourHourCapacity ||
          base.overageCapacity !== entitlement.overageCapacity
        ) {
          await tx
            .update(usageMeter)
            .set({
              fourHourCapacity: entitlement.fourHourCapacity,
              fourHourBalance: nextFourHourBalance,
              fourHourRefillAt: reset.fourHourRefillAt,
              overageCapacity: entitlement.overageCapacity,
              overageBalance: nextOverageBalance,
              updatedAt: now,
            })
            .where(eq(usageMeter.id, base.id));
        }

        return {
          ok: false as const,
          consumedFromFourHour: 0,
          consumedFromOverage: 0,
          retryAfter: nextOverageBalance > 0 ? null : reset.fourHourRefillAt,
        };
      }

      nextFourHourBalance -= spendFourHour;
      nextOverageBalance -= spendOverage;

      if (existing) {
        await tx
          .update(usageMeter)
          .set({
            fourHourCapacity: entitlement.fourHourCapacity,
            fourHourBalance: nextFourHourBalance,
            fourHourRefillAt: reset.fourHourRefillAt,
            overageCapacity: entitlement.overageCapacity,
            overageBalance: nextOverageBalance,
            updatedAt: now,
          })
          .where(eq(usageMeter.id, base.id));
      } else {
        await tx.insert(usageMeter).values({
          ...base,
          fourHourCapacity: entitlement.fourHourCapacity,
          fourHourBalance: nextFourHourBalance,
          fourHourRefillAt: reset.fourHourRefillAt,
          overageCapacity: entitlement.overageCapacity,
          overageBalance: nextOverageBalance,
        });
      }

      return {
        ok: true as const,
        consumedFromFourHour: spendFourHour,
        consumedFromOverage: spendOverage,
        retryAfter: null as Date | null,
      };
    });
  } catch (error) {
    if (!isMissingBillingTableError(error)) {
      throw error;
    }

    return {
      ok: true as const,
      consumedFromFourHour: 0,
      consumedFromOverage: 0,
      retryAfter: null as Date | null,
    };
  }
}

export async function restoreUsageUnits(input: {
  userId: string;
  meter: UsageMeterType;
  fourHourUnits?: number;
  overageUnits?: number;
}) {
  const fourHourUnits = Math.max(0, Math.floor(input.fourHourUnits ?? 0));
  const overageUnits = Math.max(0, Math.floor(input.overageUnits ?? 0));
  if (fourHourUnits + overageUnits === 0) {
    return;
  }

  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      const plan = await getUserPlan(input.userId);
      const entitlement = PLAN_ENTITLEMENTS[plan][input.meter];

      const [existing] = await tx
        .select()
        .from(usageMeter)
        .where(
          and(
            eq(usageMeter.userId, input.userId),
            eq(usageMeter.meter, input.meter)
          )
        )
        .limit(1);

      if (!existing) {
        return;
      }

      const baselineFourHourBalance = recomputeRemainingFromConsumed({
        previousBalance: existing.fourHourBalance,
        previousCapacity: existing.fourHourCapacity,
        nextCapacity: entitlement.fourHourCapacity,
      });
      const reset = advanceFourHourWindow({
        fourHourBalance: baselineFourHourBalance,
        fourHourCapacity: entitlement.fourHourCapacity,
        fourHourRefillAt: existing.fourHourRefillAt,
        now,
      });
      const overageBalance = recomputeRemainingFromConsumed({
        previousBalance: existing.overageBalance,
        previousCapacity: existing.overageCapacity,
        nextCapacity: entitlement.overageCapacity,
      });

      await tx
        .update(usageMeter)
        .set({
          fourHourCapacity: entitlement.fourHourCapacity,
          fourHourBalance: clampToCapacity(
            reset.fourHourBalance + fourHourUnits,
            entitlement.fourHourCapacity
          ),
          fourHourRefillAt: reset.fourHourRefillAt,
          overageCapacity: entitlement.overageCapacity,
          overageBalance: clampToCapacity(
            overageBalance + overageUnits,
            entitlement.overageCapacity
          ),
          updatedAt: now,
        })
        .where(eq(usageMeter.id, existing.id));
    });
  } catch (error) {
    if (!isMissingBillingTableError(error)) {
      throw error;
    }
  }
}

async function getUserStorageBytes(userId: string) {
  const [row] = await db
    .select({
      bytes: sql<number>`coalesce(sum(${fileAsset.sizeBytes}), 0)`,
    })
    .from(fileAsset)
    .where(eq(fileAsset.uploadedBy, userId));

  const bytes = Number(row?.bytes ?? 0);
  return Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
}

export async function getStorageUsageForUser(userId: string) {
  const plan = await getUserPlan(userId);
  const usedBytes = await getUserStorageBytes(userId);
  const limitBytes = PLAN_ENTITLEMENTS[plan].storageBytes;

  return {
    limitBytes,
    remainingBytes: Math.max(0, limitBytes - usedBytes),
    usedBytes,
  };
}

export async function canStoreBytesForUser(userId: string, bytes: number) {
  const storage = await getStorageUsageForUser(userId);
  const requiredBytes = Math.max(0, Math.floor(bytes));

  return {
    ok: storage.usedBytes + requiredBytes <= storage.limitBytes,
    ...storage,
  };
}

export async function getUsageOverview(userId: string) {
  let activePlan: BillingPlan = "access";
  let activeEntitlements = PLAN_ENTITLEMENTS[activePlan];
  let storage = {
    usedBytes: 0,
    limitBytes: activeEntitlements.storageBytes,
    remainingBytes: activeEntitlements.storageBytes,
  };

  let rows: (typeof usageMeter.$inferSelect)[];

  try {
    activePlan = await getUserPlan(userId);
    activeEntitlements = PLAN_ENTITLEMENTS[activePlan];

    await getOrCreateMeter(userId, "chat");
    storage = await getStorageUsageForUser(userId);

    rows = await db
      .select()
      .from(usageMeter)
      .where(and(eq(usageMeter.userId, userId), eq(usageMeter.meter, "chat")));
  } catch (error) {
    if (!isMissingBillingTableError(error)) {
      throw error;
    }

    return buildUsageOverview(activePlan);
  }

  const now = new Date();
  const normalized = rows.map((row) => {
    const entitlement = activeEntitlements.chat;
    const fourHourCapacity = entitlement.fourHourCapacity;
    const overageCapacity = entitlement.overageCapacity;
    const baselineFourHourBalance = recomputeRemainingFromConsumed({
      previousBalance: row.fourHourBalance,
      previousCapacity: row.fourHourCapacity,
      nextCapacity: fourHourCapacity,
    });
    const next = advanceFourHourWindow({
      fourHourBalance: baselineFourHourBalance,
      fourHourCapacity,
      fourHourRefillAt: row.fourHourRefillAt,
      now,
    });

    return {
      ...row,
      fourHourCapacity,
      overageCapacity,
      fourHourBalance: next.fourHourBalance,
      overageBalance: recomputeRemainingFromConsumed({
        previousBalance: row.overageBalance,
        previousCapacity: row.overageCapacity,
        nextCapacity: overageCapacity,
      }),
      fourHourRefillAt: next.fourHourRefillAt,
      shouldPersist:
        next.changed ||
        row.fourHourCapacity !== fourHourCapacity ||
        row.fourHourBalance !== next.fourHourBalance ||
        row.overageCapacity !== overageCapacity ||
        row.overageBalance !==
          recomputeRemainingFromConsumed({
            previousBalance: row.overageBalance,
            previousCapacity: row.overageCapacity,
            nextCapacity: overageCapacity,
          }),
    };
  });

  await Promise.all(
    normalized
      .filter((row) => row.shouldPersist)
      .map((row) =>
        db
          .update(usageMeter)
          .set({
            fourHourCapacity: row.fourHourCapacity,
            fourHourBalance: row.fourHourBalance,
            fourHourRefillAt: row.fourHourRefillAt,
            overageCapacity: row.overageCapacity,
            overageBalance: row.overageBalance,
            updatedAt: now,
          })
          .where(eq(usageMeter.id, row.id))
      )
  );

  const byMeter = new Map(normalized.map((row) => [row.meter, row]));
  const chat = byMeter.get("chat");

  const toMeterSummary = (row: (typeof normalized)[number] | undefined) => {
    if (!row) {
      return {
        fourHourCapacity: 0,
        fourHourBalance: 0,
        overageCapacity: 0,
        overageBalance: 0,
        totalCapacity: 0,
        totalBalance: 0,
        refillAt: null as string | null,
      };
    }

    return {
      fourHourCapacity: row.fourHourCapacity,
      fourHourBalance: row.fourHourBalance,
      overageCapacity: row.overageCapacity,
      overageBalance: row.overageBalance,
      totalCapacity: row.fourHourCapacity + row.overageCapacity,
      totalBalance: row.fourHourBalance + row.overageBalance,
      refillAt: row.fourHourRefillAt.toISOString(),
    };
  };

  const chatSummary = toMeterSummary(chat);

  return {
    plan: activePlan,
    chat: chatSummary,
    entitlements: {
      features: { ...activeEntitlements.features },
      responseSpeed: activeEntitlements.responseSpeed,
    },
    storage,
    combined: {
      totalCapacity: chatSummary.totalCapacity,
      totalBalance: chatSummary.totalBalance,
    },
  };
}

function buildUsageOverview(plan: BillingPlan) {
  const entitlements = PLAN_ENTITLEMENTS[plan];
  const toMeterSummary = (entitlement: MeterEntitlement) => ({
    fourHourCapacity: entitlement.fourHourCapacity,
    fourHourBalance: entitlement.fourHourCapacity,
    overageCapacity: entitlement.overageCapacity,
    overageBalance: entitlement.overageCapacity,
    totalCapacity: entitlement.fourHourCapacity + entitlement.overageCapacity,
    totalBalance: entitlement.fourHourCapacity + entitlement.overageCapacity,
    refillAt: null as string | null,
  });
  const chat = toMeterSummary(entitlements.chat);
  const storage = {
    usedBytes: 0,
    limitBytes: entitlements.storageBytes,
    remainingBytes: entitlements.storageBytes,
  };

  return {
    plan,
    chat,
    entitlements: {
      features: { ...entitlements.features },
      responseSpeed: entitlements.responseSpeed,
    },
    storage,
    combined: {
      totalCapacity: chat.totalCapacity,
      totalBalance: chat.totalBalance,
    },
  };
}

export async function upsertBillingCustomer(input: {
  userId: string;
  polarCustomerId: string;
  email?: string | null;
}) {
  const now = new Date();
  await db
    .insert(billingCustomer)
    .values({
      userId: input.userId,
      polarCustomerId: input.polarCustomerId,
      email: input.email ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: billingCustomer.userId,
      set: {
        polarCustomerId: input.polarCustomerId,
        email: input.email ?? null,
        updatedAt: now,
      },
    });
}

export async function upsertBillingSubscription(input: {
  userId: string;
  plan: BillingPlan;
  status: string;
  polarSubscriptionId?: string | null;
  polarProductId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
}) {
  const now = new Date();
  await db
    .insert(billingSubscription)
    .values({
      userId: input.userId,
      plan: input.plan,
      status: input.status,
      polarSubscriptionId: input.polarSubscriptionId ?? null,
      polarProductId: input.polarProductId ?? null,
      currentPeriodStart: input.currentPeriodStart ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: billingSubscription.userId,
      set: {
        plan: input.plan,
        status: input.status,
        polarSubscriptionId: input.polarSubscriptionId ?? null,
        polarProductId: input.polarProductId ?? null,
        currentPeriodStart: input.currentPeriodStart ?? null,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        updatedAt: now,
      },
    });
}

export async function findUserIdByPolarCustomerId(polarCustomerId: string) {
  const [row] = await db
    .select({ userId: billingCustomer.userId })
    .from(billingCustomer)
    .where(eq(billingCustomer.polarCustomerId, polarCustomerId))
    .limit(1);

  return row?.userId ?? null;
}

export async function getBillingCustomerByUserId(userId: string) {
  const [row] = await db
    .select({
      polarCustomerId: billingCustomer.polarCustomerId,
      email: billingCustomer.email,
    })
    .from(billingCustomer)
    .where(eq(billingCustomer.userId, userId))
    .limit(1);

  return row ?? null;
}

export async function getBillingSubscriptionByUserId(userId: string) {
  const [row] = await db
    .select({
      plan: billingSubscription.plan,
      status: billingSubscription.status,
      polarSubscriptionId: billingSubscription.polarSubscriptionId,
      polarProductId: billingSubscription.polarProductId,
      currentPeriodStart: billingSubscription.currentPeriodStart,
      currentPeriodEnd: billingSubscription.currentPeriodEnd,
    })
    .from(billingSubscription)
    .where(eq(billingSubscription.userId, userId))
    .limit(1);

  return row ?? null;
}

const PAYING_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

const PLAN_MONTHLY_PRICE_INR: Record<string, number> = {
  access: 0,
  core: 450,
  scholar: 1350,
};

export async function getAdminBillingAnalytics() {
  const [userCount] = await db.select({ value: count() }).from(user);

  const subscriptions = await db
    .select({
      plan: billingSubscription.plan,
      status: billingSubscription.status,
      polarProductId: billingSubscription.polarProductId,
      currentPeriodEnd: billingSubscription.currentPeriodEnd,
      updatedAt: billingSubscription.updatedAt,
      userEmail: user.email,
    })
    .from(billingSubscription)
    .leftJoin(user, eq(billingSubscription.userId, user.id));

  const byPlan = new Map<string, number>();
  let payingUsers = 0;
  for (const subscription of subscriptions) {
    const plan = subscription.plan || "access";
    byPlan.set(plan, (byPlan.get(plan) ?? 0) + 1);
    if (PAYING_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      payingUsers += 1;
    }
  }

  const totalUsers = userCount?.value ?? 0;
  const nonPayingUsers = Math.max(totalUsers - payingUsers, 0);
  const estimatedMrrInr = subscriptions.reduce((total, subscription) => {
    if (!PAYING_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      return total;
    }

    return total + (PLAN_MONTHLY_PRICE_INR[subscription.plan] ?? 0);
  }, 0);

  return {
    estimatedMrrInr,
    totalUsers,
    payingUsers,
    nonPayingUsers,
    byPlan: Array.from(byPlan.entries()).map(([plan, users]) => ({
      plan,
      users,
    })),
    subscriptions: subscriptions.map((subscription) => ({
      ...subscription,
      userEmail: subscription.userEmail ?? "unknown",
    })),
  };
}
