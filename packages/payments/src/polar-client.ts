type PolarServer = "sandbox" | "production";

function getPolarServer(): PolarServer {
  const configured = process.env.POLAR_SERVER;
  if (configured === "sandbox" || configured === "production") {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "production" : "sandbox";
}

function getPolarAccessToken() {
  const raw = process.env.POLAR_ACCESS_TOKEN ?? "";
  const token = raw.trim().replace(/^['"]|['"]$/g, "");

  if (!token) {
    throw new Error("Missing POLAR_ACCESS_TOKEN");
  }

  return token;
}

export function getPolarRuntimeServer() {
  return getPolarServer();
}

export function getPolarApiBaseUrl() {
  return getPolarServer() === "production"
    ? "https://api.polar.sh"
    : "https://sandbox-api.polar.sh";
}

export function getPolarRequestHeaders() {
  return {
    Authorization: `Bearer ${getPolarAccessToken()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

interface PolarFetchResponse {
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export async function polarFetch(input: { body: string; path: string }) {
  const fetchFn = Reflect.get(globalThis, "fetch") as
    | ((
        url: string,
        init: {
          body: string;
          headers: Record<string, string>;
          method: "POST";
        }
      ) => Promise<PolarFetchResponse>)
    | undefined;

  if (!fetchFn) {
    throw new Error("Fetch is unavailable in the current runtime.");
  }

  return fetchFn(`${getPolarApiBaseUrl()}${input.path}`, {
    method: "POST",
    headers: getPolarRequestHeaders(),
    body: input.body,
  });
}
