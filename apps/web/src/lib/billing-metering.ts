import { consumeUsageUnits } from "@avenire/database";

export async function consumeChatUnits(userId: string, units = 1) {
  return consumeUsageUnits({ userId, meter: "chat", units });
}
