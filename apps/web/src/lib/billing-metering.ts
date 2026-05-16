import { consumeUsageUnits } from "@/lib/database-billing-metering";

export async function consumeChatUnits(userId: string, units = 1) {
  return consumeUsageUnits({ userId, meter: "chat", units });
}

export async function consumeUploadUnits(userId: string, units = 1) {
  return consumeUsageUnits({ userId, meter: "upload", units });
}
