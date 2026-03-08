import { resolve4, resolve6 } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

const PRIVATE_V4_PREFIXES = [
  "10.",
  "127.",
  "169.254.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",
  "0.",
];

const PRIVATE_V6_PREFIXES = ["::1", "fc", "fd", "fe80"];

export const isDisallowedIpHost = (host: string): boolean => {
  const ipType = isIP(host);
  if (
    ipType === 4 &&
    PRIVATE_V4_PREFIXES.some((prefix) => host.startsWith(prefix))
  ) {
    return true;
  }

  if (
    ipType === 6 &&
    PRIVATE_V6_PREFIXES.some((prefix) => host.startsWith(prefix))
  ) {
    return true;
  }

  return false;
};

const normalizeHostname = (hostname: string): string =>
  hostname.toLowerCase().replace(/\.+$/g, "");

export const resolvePublicIps = async (hostname: string): Promise<string[]> => {
  const [v4, v6] = await Promise.allSettled([
    resolve4(hostname),
    resolve6(hostname),
  ]);

  const ips = [
    ...(v4.status === "fulfilled" ? v4.value : []),
    ...(v6.status === "fulfilled" ? v6.value : []),
  ];

  return Array.from(new Set(ips.map((ip) => normalizeHostname(ip))));
};

export const resolveSafeUrl = async (
  value: string
): Promise<{ url: URL; resolvedIps: string[] }> => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid URL: ${value}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Unsupported URL protocol for ingestion: ${parsed.protocol}`
    );
  }

  const host = normalizeHostname(parsed.hostname);
  parsed.hostname = host;
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("Localhost URLs are not allowed for ingestion.");
  }

  if (isDisallowedIpHost(host)) {
    throw new Error("Private IP URLs are not allowed for ingestion.");
  }

  const resolvedIps = isIP(host) === 0 ? await resolvePublicIps(host) : [host];
  if (resolvedIps.length === 0) {
    throw new Error(`Unable to resolve host for ingestion: ${host}`);
  }

  if (resolvedIps.some((ip) => isDisallowedIpHost(ip))) {
    throw new Error("Host resolves to a private or loopback IP.");
  }

  return {
    url: parsed,
    resolvedIps,
  };
};

export const assertSafeUrl = async (value: string): Promise<URL> => {
  const resolved = await resolveSafeUrl(value);
  return resolved.url;
};

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

const headersFromNode = (headers: Record<string, string | string[] | undefined>) =>
  Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
      return acc;
    }
    if (Array.isArray(value)) {
      acc[key] = value.join(", ");
    }
    return acc;
  }, {});

const requestWithPinnedIp = async (
  url: URL,
  pinnedIp: string,
  init?: RequestInit
): Promise<Response> => {
  if ((init?.method && init.method.toUpperCase() !== "GET") || init?.body) {
    throw new Error("Pinned fetch helper currently supports GET requests only.");
  }

  return new Promise<Response>((resolve, reject) => {
    const requestImpl = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = requestImpl(
      url,
      {
        method: "GET",
        headers: init?.headers as Record<string, string> | undefined,
        lookup: (_hostname, _options, callback) => {
          callback(null, pinnedIp, isIP(pinnedIp));
        },
        servername: url.hostname,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("error", reject);
        res.on("end", () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 500,
              headers: headersFromNode(res.headers),
            })
          );
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
};

export const fetchWithPinnedIp = async (
  input: string | URL,
  init?: RequestInit & { maxRedirects?: number }
): Promise<Response> => {
  let current = typeof input === "string" ? input : input.toString();
  const maxRedirects = Math.max(0, init?.maxRedirects ?? 5);
  const { maxRedirects: _unused, ...requestInit } = init ?? {};

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const resolved = await resolveSafeUrl(current);
    const pinnedIp = resolved.resolvedIps[0];
    if (!pinnedIp) {
      throw new Error(`Unable to pin destination IP for ${current}`);
    }

    const response = await requestWithPinnedIp(resolved.url, pinnedIp, requestInit);

    if (!REDIRECT_STATUS_CODES.has(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`Redirect missing location for ${resolved.url.toString()}`);
    }
    if (redirectCount === maxRedirects) {
      throw new Error(`Too many redirects while fetching ${resolved.url.toString()}`);
    }

    current = new URL(location, resolved.url).toString();
  }

  throw new Error(`Too many redirects while fetching ${current}`);
};

export const assertMaxSize = (
  name: string,
  size: number,
  maxSize: number
): void => {
  if (size > maxSize) {
    throw new Error(`${name} exceeds max size (${size} > ${maxSize} bytes).`);
  }
};

export const decodeBase64ToBytes = (input: string): Uint8Array => {
  const normalized = input.includes(",")
    ? input.slice(input.indexOf(",") + 1)
    : input;
  return Uint8Array.from(Buffer.from(normalized, "base64"));
};
