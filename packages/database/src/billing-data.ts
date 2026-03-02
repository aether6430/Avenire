import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "./client";
import { billingCustomer, billingSubscription, usageMeter } from "./schema";

export type BillingPlan = "access" | "core" | "scholar";
export type UsageMeterType = "chat" | "upload";

interface MeterEntitlement {
  fourHourCapacity: number;
  overageCapacity: number;
}

interface PlanEntitlements {
  chat: MeterEntitlement;
  upload: MeterEntitlement;
}

const FOUR_HOUR_MS = 4 * 60 * 60 * 1000;

const PLAN_ENTITLEMENTS: Record<BillingPlan, PlanEntitlements> = {
  access: {
    chat: { fourHourCapacity: 20, overageCapacity: 200 },
    upload: { fourHourCapacity: 20, overageCapacity: 200 },
  },
  core: {
    chat: { fourHourCapacity: 80, overageCapacity: 1800 },
    upload: { fourHourCapacity: 50, overageCapacity: 900 },
  },
  scholar: {
    chat: { fourHourCapacity: 180, overageCapacity: 6500 },
    upload: { fourHourCapacity: 120, overageCapacity: 2200 },
  },
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

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
    fourHourRefillAt: new Date(input.fourHourRefillAt.getTime() + windowsPassed * FOUR_HOUR_MS),
    changed: true,
  };
}

async function getUserPlan(userId: string): Promise<BillingPlan> {
  const [subscription] = await db
    .select({
      status: billingSubscription.status,
      plan: billingSubscription.plan,
    })
    .from(billingSubscription)
    .where(eq(billingSubscription.userId, userId))
    .limit(1);

  if (!subscription) {
    return "access";
  }

  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return "access";
  }

  return toPlan(subscription.plan);
}

async function getOrCreateMeter(userId: string, meter: UsageMeterType) {
  const plan = await getUserPlan(userId);
  const entitlement = PLAN_ENTITLEMENTS[plan][meter];

  const [existing] = await db
    .select()
    .from(usageMeter)
    .where(and(eq(usageMeter.userId, userId), eq(usageMeter.meter, meter)))
    .limit(1);

  if (existing) {
    return { meterRow: existing, plan, entitlement };
  }

  const now = new Date();
  const [created] = await db
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
    .returning();

  return { meterRow: created, plan, entitlement };
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

  return db.transaction(async (tx) => {
    const plan = await getUserPlan(input.userId);
    const entitlement = PLAN_ENTITLEMENTS[plan][input.meter];

    const [existing] = await tx
      .select()
      .from(usageMeter)
      .where(and(eq(usageMeter.userId, input.userId), eq(usageMeter.meter, input.meter)))
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

    const reset = advanceFourHourWindow({
      fourHourBalance: Math.min(base.fourHourBalance, entitlement.fourHourCapacity),
      fourHourCapacity: entitlement.fourHourCapacity,
      fourHourRefillAt: base.fourHourRefillAt,
      now,
    });

    let nextFourHourBalance = reset.fourHourBalance;
    let nextOverageBalance = Math.min(base.overageBalance, entitlement.overageCapacity);

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
      } else if (reset.changed || base.fourHourCapacity !== entitlement.fourHourCapacity || base.overageCapacity !== entitlement.overageCapacity) {
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

    if (!existing) {
      await tx.insert(usageMeter).values({
        ...base,
        fourHourCapacity: entitlement.fourHourCapacity,
        fourHourBalance: nextFourHourBalance,
        fourHourRefillAt: reset.fourHourRefillAt,
        overageCapacity: entitlement.overageCapacity,
        overageBalance: nextOverageBalance,
      });
    } else {
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
      ok: true as const,
      consumedFromFourHour: spendFourHour,
      consumedFromOverage: spendOverage,
      retryAfter: null as Date | null,
    };
  });
}

export async function getUsageOverview(userId: string) {
  const activePlan = await getUserPlan(userId);
  const activeEntitlements = PLAN_ENTITLEMENTS[activePlan];

  await Promise.all([
    getOrCreateMeter(userId, "chat"),
    getOrCreateMeter(userId, "upload"),
  ]);

  const rows = await db
    .select()
    .from(usageMeter)
    .where(and(eq(usageMeter.userId, userId), inArray(usageMeter.meter, ["chat", "upload"])));

  const now = new Date();
  const normalized = rows.map((row) => {
    const entitlement =
      row.meter === "chat"
        ? activeEntitlements.chat
        : activeEntitlements.upload;
    const fourHourCapacity = entitlement.fourHourCapacity;
    const overageCapacity = entitlement.overageCapacity;
    const next = advanceFourHourWindow({
      fourHourBalance: Math.min(row.fourHourBalance, fourHourCapacity),
      fourHourCapacity,
      fourHourRefillAt: row.fourHourRefillAt,
      now,
    });

    return {
      ...row,
      fourHourCapacity,
      overageCapacity,
      fourHourBalance: next.fourHourBalance,
      overageBalance: Math.min(row.overageBalance, overageCapacity),
      fourHourRefillAt: next.fourHourRefillAt,
      shouldPersist: next.changed,
    };
  });

  await Promise.all(
    normalized
      .filter((row) => row.shouldPersist)
      .map((row) =>
        db
          .update(usageMeter)
          .set({
            fourHourBalance: row.fourHourBalance,
            fourHourRefillAt: row.fourHourRefillAt,
            updatedAt: now,
          })
          .where(eq(usageMeter.id, row.id)),
      ),
  );

  const byMeter = new Map(normalized.map((row) => [row.meter, row]));
  const chat = byMeter.get("chat");
  const upload = byMeter.get("upload");

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
  const uploadSummary = toMeterSummary(upload);

  return {
    plan: activePlan,
    chat: chatSummary,
    upload: uploadSummary,
    combined: {
      totalCapacity: chatSummary.totalCapacity + uploadSummary.totalCapacity,
      totalBalance: chatSummary.totalBalance + uploadSummary.totalBalance,
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
