import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ProbeResult {
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  error: string | null;
}

async function probe(url: string, timeoutMs: number): Promise<ProbeResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown probe failure",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const cloudBaseUrl = process.env.CLOUD_PROXY_BASE_URL?.trim() ?? "";
  const allowLocalOllama =
    (process.env.DESKTOP_ALLOW_LOCAL_OLLAMA ?? "false").toLowerCase() ===
    "true";
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL?.trim() ?? "http://127.0.0.1:11434";

  const cloudProbe = cloudBaseUrl
    ? await probe(`${cloudBaseUrl.replace(/\/$/, "")}/api/desktop/health`, 3_500)
    : {
        ok: false,
        status: null,
        latencyMs: null,
        error: "CLOUD_PROXY_BASE_URL not configured",
      };

  const ollamaProbe = allowLocalOllama
    ? await probe(`${ollamaBaseUrl.replace(/\/$/, "")}/api/tags`, 2_000)
    : {
        ok: false,
        status: null,
        latencyMs: null,
        error: "Local Ollama fallback disabled",
      };

  const mode = cloudProbe.ok
    ? "online"
    : ollamaProbe.ok
      ? "degraded_offline_ollama"
      : "offline";

  return NextResponse.json(
    {
      mode,
      runtime: process.env.APP_RUNTIME ?? "web",
      cloud: {
        enabled: Boolean(cloudBaseUrl),
        ...cloudProbe,
      },
      ollama: {
        enabled: allowLocalOllama,
        baseUrl: allowLocalOllama ? ollamaBaseUrl : null,
        ...ollamaProbe,
      },
      capabilities: {
        localData: true,
        localPlayback: true,
        localTextGeneration: ollamaProbe.ok,
        cloudEmbeddings: cloudProbe.ok,
        multimodalIngestion: cloudProbe.ok,
      },
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    }
  );
}
