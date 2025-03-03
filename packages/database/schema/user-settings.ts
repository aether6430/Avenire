import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  uuid
} from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  userId: text("user_id").notNull(),
  model: text("model").notNull().default("gemini-2-flash-lite"),
  style: text("learning_style").notNull().default("interactive"),
  difficulty: integer("difficulty").notNull().default(5),
  pacing: boolean("pacing").notNull().default(true),
  email_notification: boolean("email_notification").notNull().default(false),
});
