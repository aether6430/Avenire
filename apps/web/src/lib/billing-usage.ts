import { getUsageOverview } from "@/lib/database-billing-usage";

export async function getUserUsageOverview(userId: string) {
  return getUsageOverview(userId);
}
