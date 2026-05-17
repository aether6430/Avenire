declare const Bun: any;

interface Options {
  cookieFile: string;
  port: number;
  upstream: string;
}

const DEFAULT_COOKIE_FILE = "output/auth-login-cookies.txt";
const DEFAULT_PORT = 4010;
const DEFAULT_UPSTREAM = "http://127.0.0.1:3003";

function parseArgs(argv: string[]): Options {
  const options: Options = {
    cookieFile: DEFAULT_COOKIE_FILE,
    port: DEFAULT_PORT,
    upstream: DEFAULT_UPSTREAM,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--cookie-file" && argv[index + 1]) {
      options.cookieFile = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--port" && argv[index + 1]) {
      options.port = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--upstream" && argv[index + 1]) {
      options.upstream = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  if (!Number.isInteger(options.port) || options.port <= 0) {
    throw new Error(`Invalid --port value: ${options.port}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage:

  bun scripts/local-auth-session-proxy.ts \\
    [--cookie-file output/auth-login-cookies.txt] \\
    [--upstream http://127.0.0.1:3003] \\
    [--port 4010]
`);
}

async function readCookieHeader(cookieFile: string): Promise<string> {
  const file = Bun.file(cookieFile);
  if (!(await file.exists())) {
    throw new Error(`Cookie file not found: ${cookieFile}`);
  }

  const value = await file.text();
  const cookies: string[] = [];
  for (const line of value.split(/\r?\n/)) {
    if (!line) {
      continue;
    }
    const normalizedLine = line.startsWith("#HttpOnly_")
      ? line.slice("#HttpOnly_".length)
      : line;
    if (normalizedLine.startsWith("#")) {
      continue;
    }
    const fields = normalizedLine.split("\t");
    if (fields.length < 7) {
      continue;
    }
    const [, , , , , name, rawValue] = fields;
    cookies.push(`${name}=${rawValue}`);
  }
  if (cookies.length === 0) {
    throw new Error(`No cookies found in ${cookieFile}`);
  }
  return cookies.join("; ");
}

function sanitizeResponseHeaders(source: Headers): Headers {
  const headers = new Headers(source);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("set-cookie");
  headers.delete("transfer-encoding");
  return headers;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const upstream = new URL(options.upstream);
  const cookieHeader = await readCookieHeader(options.cookieFile);

  const server = Bun.serve({
    idleTimeout: 60,
    port: options.port,
    async fetch(request) {
      const incomingUrl = new URL(request.url);
      const targetUrl = new URL(
        `${incomingUrl.pathname}${incomingUrl.search}`,
        upstream
      );

      const headers = new Headers(request.headers);
      headers.set("host", upstream.host);
      headers.set("cookie", cookieHeader);
      headers.set("accept-encoding", "identity");

      const response = await fetch(targetUrl, {
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : request.body,
        duplex:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : "half",
        headers,
        method: request.method,
        redirect: "manual",
      });

      return new Response(response.body, {
        headers: sanitizeResponseHeaders(response.headers),
        status: response.status,
        statusText: response.statusText,
      });
    },
  });

  console.log(
    `Authenticated session proxy ready: http://127.0.0.1:${server.port} -> ${upstream.origin}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
