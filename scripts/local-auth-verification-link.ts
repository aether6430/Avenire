import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string) {
  try {
    const source = readFileSync(filePath, "utf8");
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key || process.env[key]) {
        continue;
      }

      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch {
    // Missing env files are fine for this helper; later validation is explicit.
  }
}

function parseArgs(argv: string[]) {
  const args = [...argv];
  let email = "";
  let callbackPath = "/workspace";
  let approveWaitlist = false;

  while (args.length > 0) {
    const current = args.shift() ?? "";
    if (!current) {
      continue;
    }

    if (current === "--approve-waitlist") {
      approveWaitlist = true;
      continue;
    }

    if (current === "--callback") {
      callbackPath = args.shift() ?? callbackPath;
      continue;
    }

    if (!email) {
      email = current;
    }
  }

  return {
    approveWaitlist,
    callbackPath,
    email,
  };
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

function base64UrlEncode(input: string | Uint8Array) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function resolveAuthBaseUrl() {
  const raw =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!raw) {
    throw new Error(
      "Missing BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL in env. Local auth helper needs an app base URL."
    );
  }

  const baseUrl = normalizeBaseUrl(raw);
  return baseUrl.endsWith("/api/auth") ? baseUrl : `${baseUrl}/api/auth`;
}

function escapeSqlLiteral(value: string) {
  return value.replaceAll("'", "''");
}

function runPsql(databaseUrl: string, sql: string) {
  try {
    return execFileSync("psql", [databaseUrl, "-tA", "-c", sql], {
      encoding: "utf8",
    }).trim();
  } catch (error) {
    const stderr =
      error &&
      typeof error === "object" &&
      "stderr" in error &&
      typeof error.stderr === "string"
        ? error.stderr.trim()
        : "";
    const status =
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : null;

    if (status === 2 && stderr.includes("Connection refused")) {
      throw new Error(
        "Local Postgres is not reachable at DATABASE_URL. Start the local database, then rerun this helper."
      );
    }

    throw error;
  }
}

async function createEmailVerificationToken(secret: string, email: string) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const payload = {
    email: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(unsigned).digest();
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

async function main() {
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));

  const { approveWaitlist, callbackPath, email } = parseArgs(
    process.argv.slice(2)
  );

  if (!email) {
    console.error(
      "Usage: bun scripts/local-auth-verification-link.ts <email> [--approve-waitlist] [--callback /workspace]"
    );
    process.exit(1);
  }

  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!secret) {
    throw new Error(
      "Missing BETTER_AUTH_SECRET in env. Local auth helper cannot sign a verification token."
    );
  }
  if (!databaseUrl) {
    throw new Error(
      "Missing DATABASE_URL in env. Local auth helper needs database access."
    );
  }

  const authBaseUrl = resolveAuthBaseUrl();
  const normalizedEmail = email.trim().toLowerCase();
  const escapedEmail = escapeSqlLiteral(normalizedEmail);

  if (approveWaitlist) {
    const waitlistResult = runPsql(
      databaseUrl,
      `insert into waitlist (id, email, status, requested_at, processed_at)
       values (
         'local-' || substr(md5('${escapedEmail}'), 1, 12),
         '${escapedEmail}',
         'approved',
         now(),
         now()
       )
       on conflict (email) do update
       set status = 'approved',
           processed_at = now()
       returning email, status;`
    );
    console.log(`Approved waitlist entry: ${waitlistResult}`);
  }

  const userRow = runPsql(
    databaseUrl,
    `select id, email_verified
     from "user"
     where email = '${escapedEmail}'
     limit 1;`
  );

  if (!userRow) {
    console.log(
      "No user exists for that email yet. The waitlist entry is ready; sign up in the local app, then rerun this helper to print a verification URL."
    );
    return;
  }

  const [, emailVerified] = userRow.split("|");
  if (emailVerified === "t") {
    console.log(`User ${normalizedEmail} is already verified.`);
    return;
  }

  const token = await createEmailVerificationToken(secret, normalizedEmail);
  const callbackURL = encodeURIComponent(callbackPath || "/workspace");
  const verificationUrl = `${authBaseUrl}/verify-email?token=${token}&callbackURL=${callbackURL}`;

  console.log(`Verification URL for ${normalizedEmail}:`);
  console.log(verificationUrl);
}

await main();
