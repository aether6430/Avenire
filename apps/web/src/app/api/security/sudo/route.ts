import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleSudoRouteGet } from "./sudo-route-get";
import { handleSudoRoutePost } from "./sudo-route-post";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleSudoRouteGet({
    userId: user.id,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleSudoRoutePost({
    request,
    user,
  });
}
