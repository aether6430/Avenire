import { loadDatabaseEnv } from "@avenire/database/load-env";
import { Emailer, renderWaitlistWelcomeEmail } from "@avenire/emailer";

loadDatabaseEnv();

const { listWaitlistEntries } = await import("@avenire/database");
const { pool } = await import("@avenire/database/client");

const PUBLIC_BASE_URL = "https://avenire.space";

function getFlagValue(name: string) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function getLimit() {
  const raw = getFlagValue("--limit");
  if (!raw) {
    return 500;
  }

  const limit = Number.parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error("--limit must be a positive number");
  }

  return limit;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limit = getLimit();
  const emailer = new Emailer();
  const entries = await listWaitlistEntries({
    status: "pending",
    limit,
  });

  console.log(
    `[waitlist] found ${entries.length} pending entries${
      dryRun ? " (dry run)" : ""
    }`
  );

  let sent = 0;
  let failed = 0;

  for (const entry of entries) {
    if (dryRun) {
      console.log(`[waitlist] would send ${entry.email}`);
      continue;
    }

    try {
      await emailer.send({
        to: [entry.email],
        subject: "Welcome to the Avenire waitlist",
        html: await renderWaitlistWelcomeEmail({
          email: entry.email,
          loginUrl: `${PUBLIC_BASE_URL}/waitlist`,
        }),
        replyTo: "support@avenire.space",
      });
      sent += 1;
      console.log(`[waitlist] sent ${entry.email}`);
    } catch (error) {
      failed += 1;
      console.error(`[waitlist] failed ${entry.email}`, error);
    }
  }

  console.log(`[waitlist] complete: sent=${sent} failed=${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

try {
  await main();
} finally {
  await pool.end();
}
