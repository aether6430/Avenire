import { eq } from "drizzle-orm";
import { user } from "./auth-schema";
import { db } from "./client";

export async function deleteAuthUserById(userId: string) {
  const [deleted] = await db
    .delete(user)
    .where(eq(user.id, userId))
    .returning({ id: user.id });

  return deleted ?? null;
}
