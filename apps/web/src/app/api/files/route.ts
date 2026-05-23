import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { handleFilesRouteGet } from "./files-route-get";
import {
  FILES_ROUTE_LOAD_ERROR,
  resolveFilesRouteActiveOrganizationId,
  resolveFilesRouteError,
} from "./files-route-model";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ files: [] }, { status: 401 });
    }

    return await handleFilesRouteGet({
      activeOrganizationId: resolveFilesRouteActiveOrganizationId(session),
      uploadThingToken: process.env.UPLOADTHING_TOKEN,
      userId: session.user.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFilesRouteError(error, FILES_ROUTE_LOAD_ERROR),
        files: [],
      },
      { status: 500 }
    );
  }
}
