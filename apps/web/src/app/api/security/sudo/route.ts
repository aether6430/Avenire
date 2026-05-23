import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleSudoRouteGet } from "./sudo-route-get";
import {
  resolveSudoRouteError,
  SUDO_ROUTE_ACTION_ERROR,
  SUDO_ROUTE_STATUS_ERROR,
} from "./sudo-route-model";
import { handleSudoRoutePost } from "./sudo-route-post";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleSudoRouteGet({
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: resolveSudoRouteError(error, SUDO_ROUTE_STATUS_ERROR) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleSudoRoutePost({
      request,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      { error: resolveSudoRouteError(error, SUDO_ROUTE_ACTION_ERROR) },
      { status: 500 }
    );
  }
}
