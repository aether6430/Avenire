import { and, desc, eq } from "drizzle-orm";
import { account } from "./auth-schema";
import { db } from "./client";

const authAccountSelection = {
  accessToken: account.accessToken,
  accessTokenExpiresAt: account.accessTokenExpiresAt,
  accountId: account.accountId,
  createdAt: account.createdAt,
  id: account.id,
  providerId: account.providerId,
  refreshToken: account.refreshToken,
  scope: account.scope,
  updatedAt: account.updatedAt,
};

export async function listAuthAccountsForUser(input: {
  providerId: string;
  userId: string;
}) {
  return db
    .select({
      ...authAccountSelection,
    })
    .from(account)
    .where(
      and(
        eq(account.userId, input.userId),
        eq(account.providerId, input.providerId),
      ),
    )
    .orderBy(desc(account.updatedAt));
}

export async function getLatestAuthAccountForUser(input: {
  providerId: string;
  userId: string;
}) {
  const [record] = await listAuthAccountsForUser(input);
  return record ?? null;
}
