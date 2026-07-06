import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  Agent,
  type BodyInit,
  type Dispatcher,
  type HeadersInit,
  type Response,
  fetch as undiciFetch,
} from "undici";

const MAX_REMOTE_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

interface LookupAddress {
  address: string;
  family: 4 | 6;
}

type LookupFunction = (
  hostname: string,
  options: { all: true; verbatim: true }
) => Promise<LookupAddress[]>;

export interface SafeRemoteFetchInit {
  body?: BodyInit | null;
  dispatcher?: Dispatcher;
  headers?: HeadersInit;
  lookup?: LookupFunction;
  method?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const defaultLookup: LookupFunction = async (hostname) => {
  const records = await dnsLookup(hostname, { all: true, verbatim: true });
  return records.map((record) => ({
    address: record.address,
    family: record.family === 6 ? 6 : 4,
  }));
};

const parseIpv4Address = (value: string): number[] | null => {
  const octets = value
    .split(".")
    .map((segment) => Number.parseInt(segment, 10));
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return null;
  }

  if (octets.some((octet) => octet < 0 || octet > 255)) {
    return null;
  }

  return octets;
};

function isUnsafeIpv4Address(address: string) {
  const octets = parseIpv4Address(address);
  if (!octets) {
    return false;
  }

  const [first, second, third] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127) ||
    first >= 224 ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113)
  );
}

const expandIpv6Address = (address: string): number[] | null => {
  const zoneIndex = address.indexOf("%");
  const normalized = (zoneIndex >= 0 ? address.slice(0, zoneIndex) : address)
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  const mappedMatch = normalized.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  const ipv6Part = mappedMatch
    ? (mappedMatch[1] ?? "").replace(/:$/, "")
    : normalized;
  const ipv4Tail = mappedMatch ? parseIpv4Address(mappedMatch[2] ?? "") : null;
  if (mappedMatch && !ipv4Tail) {
    return null;
  }

  const halves = ipv6Part.split("::");
  if (halves.length > 2) {
    return null;
  }

  const parseGroups = (value: string): number[] => {
    if (!value) {
      return [];
    }
    return value.split(":").map((segment) => Number.parseInt(segment, 16));
  };

  const left = parseGroups(halves[0] ?? "");
  const right = parseGroups(halves[1] ?? "");
  if (
    [...left, ...right].some(
      (group) => !Number.isInteger(group) || group < 0 || group > 0xff_ff
    )
  ) {
    return null;
  }

  const tailGroups = ipv4Tail
    ? [(ipv4Tail[0] << 8) | ipv4Tail[1], (ipv4Tail[2] << 8) | ipv4Tail[3]]
    : [];
  const explicitGroups = left.length + right.length + tailGroups.length;
  const missingGroups = halves.length === 2 ? 8 - explicitGroups : 0;
  if (missingGroups < 0 || (halves.length === 1 && explicitGroups !== 8)) {
    return null;
  }

  return [
    ...left,
    ...new Array(missingGroups).fill(0),
    ...right,
    ...tailGroups,
  ];
};

function isUnsafeIpv6Address(address: string) {
  const groups = expandIpv6Address(address);
  if (!groups) {
    return false;
  }

  const isUnspecified = groups.every((group) => group === 0);
  const isLoopback =
    groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;
  const isUniqueLocal = (groups[0] & 0xfe_00) === 0xfc_00;
  const isLinkLocal = (groups[0] & 0xff_c0) === 0xfe_80;
  const isMulticast = (groups[0] & 0xff_00) === 0xff_00;
  const isMappedIpv4 =
    groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xff_ff;
  const mappedIpv4 = isMappedIpv4
    ? `${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`
    : null;

  return (
    isUnspecified ||
    isLoopback ||
    isUniqueLocal ||
    isLinkLocal ||
    isMulticast ||
    (mappedIpv4 ? isUnsafeIpv4Address(mappedIpv4) : false)
  );
}

export const isUnsafeRemoteAddress = (address: string): boolean => {
  const normalizedAddress = address.replace(/^\[|\]$/g, "");
  const ipType = isIP(normalizedAddress);
  if (ipType === 4) {
    return isUnsafeIpv4Address(normalizedAddress);
  }
  if (ipType === 6) {
    return isUnsafeIpv6Address(normalizedAddress);
  }
  return false;
};

export const assertSafeUrl = (value: string): URL => {
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

  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("Localhost URLs are not allowed for ingestion.");
  }

  const ipType = isIP(host.replace(/^\[|\]$/g, ""));
  if (parsed.username || parsed.password) {
    throw new Error("Credential-bearing URLs are not allowed for ingestion.");
  }

  if (ipType === 4 && isUnsafeRemoteAddress(host)) {
    throw new Error("Private IPv4 URLs are not allowed for ingestion.");
  }

  if (ipType === 6 && isUnsafeRemoteAddress(host)) {
    throw new Error("Private IPv6 URLs are not allowed for ingestion.");
  }

  return parsed;
};

export const assertResolvedRemoteUrlIsSafe = async (
  value: string,
  lookup: LookupFunction = defaultLookup
): Promise<URL> => {
  const parsed = assertSafeUrl(value);
  if (isIP(parsed.hostname.replace(/^\[|\]$/g, ""))) {
    return parsed;
  }

  const records = await lookup(parsed.hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error("Remote URL hostname did not resolve for ingestion.");
  }

  const unsafe = records.find((record) =>
    isUnsafeRemoteAddress(record.address)
  );
  if (unsafe) {
    throw new Error(
      `Unsafe DNS address is not allowed for ingestion: ${unsafe.address}`
    );
  }

  return parsed;
};

const createSafeDispatcher = (lookup: LookupFunction): Dispatcher =>
  new Agent({
    connect: {
      lookup: (hostname, _options, callback) => {
        void lookup(hostname, { all: true, verbatim: true })
          .then((records) => {
            const unsafe = records.find((record) =>
              isUnsafeRemoteAddress(record.address)
            );
            if (unsafe) {
              callback(
                new Error(
                  `Unsafe connection address is not allowed for ingestion: ${unsafe.address}`
                ),
                "",
                0
              );
              return;
            }

            const first = records[0];
            if (!first) {
              callback(
                new Error("Remote URL hostname did not resolve for ingestion."),
                "",
                0
              );
              return;
            }
            callback(null, first.address, first.family);
          })
          .catch((error: unknown) => {
            callback(
              error instanceof Error ? error : new Error("DNS lookup failed."),
              "",
              0
            );
          });
      },
    },
  });

const safeUrlForMessage = (url: URL): string => `${url.protocol}//${url.host}`;

export const safeRemoteFetch = async (
  value: string,
  init: SafeRemoteFetchInit = {}
): Promise<Response> => {
  const lookup = init.lookup ?? defaultLookup;
  const dispatcher = init.dispatcher ?? createSafeDispatcher(lookup);
  let currentUrl = await assertResolvedRemoteUrlIsSafe(value, lookup);
  let redirects = 0;
  let method = init.method ?? "GET";
  let body = init.body;

  while (true) {
    const controller = init.timeoutMs ? new AbortController() : null;
    const timeout = controller
      ? setTimeout(() => controller.abort(), init.timeoutMs)
      : null;
    const signal = controller?.signal ?? init.signal;
    if (controller && init.signal) {
      if (init.signal.aborted) {
        controller.abort();
      } else {
        init.signal.addEventListener("abort", () => controller.abort(), {
          once: true,
        });
      }
    }

    try {
      const response = await undiciFetch(currentUrl, {
        body: body ?? undefined,
        dispatcher,
        headers: init.headers,
        method,
        redirect: "manual",
        signal,
      });

      if (!REDIRECT_STATUSES.has(response.status)) {
        return response;
      }

      redirects += 1;
      if (redirects > MAX_REMOTE_REDIRECTS) {
        throw new Error("Remote ingestion redirect limit exceeded.");
      }

      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Remote ingestion redirect missing Location header.");
      }

      const nextUrl = new URL(location, currentUrl);
      currentUrl = await assertResolvedRemoteUrlIsSafe(
        nextUrl.toString(),
        lookup
      );
      if (
        response.status === 303 ||
        (response.status !== 307 && method === "POST")
      ) {
        method = "GET";
        body = null;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Safe remote fetch failed for ${safeUrlForMessage(currentUrl)}: ${message}`
      );
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
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
