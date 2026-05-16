import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { handleFilesRouteGet } from "./files-route-get";
import { resolveFilesRouteActiveOrganizationId } from "./files-route-model";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ files: [] }, { status: 401 });
  }

  return await handleFilesRouteGet({
    activeOrganizationId: resolveFilesRouteActiveOrganizationId(session),
    uploadThingToken: process.env.UPLOADTHING_TOKEN,
    userId: session.user.id,
  });
}
