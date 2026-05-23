import { consumeUsageUnits } from "@/lib/database-billing-metering";

export async function consumeChatUnits(userId: string, units = 1) {
  return consumeUsageUnits({ userId, meter: "chat", units });
}
