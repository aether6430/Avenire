import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { user } from "./auth-schema";
import { billingUsageEvent, usageMeter } from "./schema";

const runDatabaseTests = process.env.RUN_DATABASE_INTEGRATION_TESTS === "true";
const createdUserIds = new Set<string>();

describe.runIf(runDatabaseTests)("atomic billing admission", () => {
  afterEach(async () => {
    if (createdUserIds.size === 0) {
      return;
    }

    const { db } = await import("./client");
    await db.delete(user).where(eq(user.id, Array.from(createdUserIds)[0]));
    createdUserIds.clear();
  });

  it("admits exactly 25 of 50 simultaneous one-credit requests", async () => {
    const [{ consumeUsageUnits }, { db }] = await Promise.all([
      import("./billing-data"),
      import("./client"),
    ]);
    const userId = `billing-atomic-${randomUUID()}`;
    const now = new Date();
    createdUserIds.add(userId);

    await db.insert(user).values({
      id: userId,
      name: "Billing concurrency test",
      email: `${userId}@example.invalid`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(usageMeter).values({
      id: randomUUID(),
      userId,
      meter: "chat",
      fourHourCapacity: 30,
      fourHourBalance: 25,
      fourHourRefillAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      overageCapacity: 300,
      overageBalance: 0,
      createdAt: now,
      updatedAt: now,
    });

    const previousCreditsMode = process.env.POLAR_CREDITS_MODE;
    process.env.POLAR_CREDITS_MODE = "disabled";
    try {
      const admissions = await Promise.all(
        Array.from({ length: 50 }, () =>
          consumeUsageUnits({ userId, meter: "chat", units: 1 })
        )
      );

      expect(admissions.filter((admission) => admission.ok)).toHaveLength(25);

      const [meter] = await db
        .select({
          fourHourBalance: usageMeter.fourHourBalance,
          overageBalance: usageMeter.overageBalance,
        })
        .from(usageMeter)
        .where(and(eq(usageMeter.userId, userId), eq(usageMeter.meter, "chat")))
        .limit(1);

      expect(meter).toEqual({ fourHourBalance: 0, overageBalance: 0 });
    } finally {
      if (previousCreditsMode === undefined) {
        process.env.POLAR_CREDITS_MODE = undefined;
      } else {
        process.env.POLAR_CREDITS_MODE = previousCreditsMode;
      }
    }
  }, 15_000);

  it("restores a retried refund once and emits one immutable event", async () => {
    const [{ restoreUsageUnits }, { db }] = await Promise.all([
      import("./billing-data"),
      import("./client"),
    ]);
    const userId = `billing-refund-${randomUUID()}`;
    const idempotencyKey = `chat-refund:${randomUUID()}`;
    const now = new Date();
    createdUserIds.add(userId);

    await db.insert(user).values({
      id: userId,
      name: "Billing refund test",
      email: `${userId}@example.invalid`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(usageMeter).values({
      id: randomUUID(),
      userId,
      meter: "chat",
      fourHourCapacity: 30,
      fourHourBalance: 0,
      fourHourRefillAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      overageCapacity: 300,
      overageBalance: 0,
      createdAt: now,
      updatedAt: now,
    });

    const previousCreditsMode = process.env.POLAR_CREDITS_MODE;
    process.env.POLAR_CREDITS_MODE = "shadow";
    try {
      const refund = {
        userId,
        meter: "chat",
        fourHourUnits: 1,
        overageUnits: 0,
        idempotencyKey,
      } satisfies Parameters<typeof restoreUsageUnits>[0];
      await Promise.all([restoreUsageUnits(refund), restoreUsageUnits(refund)]);

      const [meter] = await db
        .select({ fourHourBalance: usageMeter.fourHourBalance })
        .from(usageMeter)
        .where(and(eq(usageMeter.userId, userId), eq(usageMeter.meter, "chat")))
        .limit(1);
      const events = await db
        .select({ units: billingUsageEvent.units })
        .from(billingUsageEvent)
        .where(eq(billingUsageEvent.idempotencyKey, idempotencyKey));

      expect(meter?.fourHourBalance).toBe(1);
      expect(events).toEqual([{ units: -1 }]);
    } finally {
      if (previousCreditsMode === undefined) {
        process.env.POLAR_CREDITS_MODE = undefined;
      } else {
        process.env.POLAR_CREDITS_MODE = previousCreditsMode;
      }
    }
  }, 15_000);
});
