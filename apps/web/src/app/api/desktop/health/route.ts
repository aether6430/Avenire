import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      runtime: process.env.APP_RUNTIME ?? "web",
      timestamp: new Date().toISOString(),
      pid: process.pid,
      version: process.env.npm_package_version ?? "0.0.0",
    },
    {
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    }
  );
}
