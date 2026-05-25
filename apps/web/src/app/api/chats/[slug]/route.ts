import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { handleChatSlugGet } from "./chat-slug-route-get";
import {
  CHAT_SLUG_BRANCH_ERROR,
  CHAT_SLUG_DELETE_ERROR,
  CHAT_SLUG_LOAD_ERROR,
  CHAT_SLUG_UPDATE_ERROR,
  resolveChatSlugRouteError,
} from "./chat-slug-route-model";
import {
  handleChatSlugBranch,
  handleChatSlugDelete,
  handleChatSlugPatch,
} from "./chat-slug-route-mutations";

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    return await handleChatSlugGet({
      slug,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: resolveChatSlugRouteError(error, CHAT_SLUG_LOAD_ERROR) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      pinned?: boolean;
      icon?: string | null;
    };

    return await handleChatSlugPatch({
      body,
      slug,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: resolveChatSlugRouteError(error, CHAT_SLUG_UPDATE_ERROR) },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    return await handleChatSlugBranch({
      slug,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: resolveChatSlugRouteError(error, CHAT_SLUG_BRANCH_ERROR) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    return await handleChatSlugDelete({
      slug,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: resolveChatSlugRouteError(error, CHAT_SLUG_DELETE_ERROR) },
      { status: 500 }
    );
  }
}
