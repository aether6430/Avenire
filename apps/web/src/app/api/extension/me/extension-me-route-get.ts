import { NextResponse } from "next/server";

export async function handleExtensionMeRouteGet(input: {
  user: {
    [key: string]: unknown;
  };
}) {
  return NextResponse.json({
    user: input.user,
  });
}
