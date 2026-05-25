import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleAccountRouteDelete } from "./account-route-delete";
import {
  ACCOUNT_DELETE_ERROR,
  resolveAccountDeleteError,
} from "./account-route-model";

export async function DELETE() {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleAccountRouteDelete({
      userId: currentUser.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveAccountDeleteError(error, ACCOUNT_DELETE_ERROR),
      },
      { status: 500 }
    );
  }
}
