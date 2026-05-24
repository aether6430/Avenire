import { sendSudoVerificationCodeEmail } from "@avenire/auth/server";
import { getLatestActiveSudoChallenge } from "@avenire/database";
import { NextResponse } from "next/server";
import {
  createSudoChallenge,
  invalidateSudoChallenge,
  SUDO_CHALLENGE_TTL_SECONDS,
  SUDO_COOKIE_NAME,
  SUDO_SESSION_TTL_SECONDS,
  verifySudoCode,
} from "@/lib/sudo";
import {
  isSudoChallengeRateLimited,
  normalizeSudoCode,
  resolveSudoAction,
} from "./sudo-route-model";

export async function handleSudoRoutePost(input: {
  request: Request;
  user: { id: string; email: string };
}) {
  const payload = (await input.request.json().catch(() => ({}))) as {
    action?: "request" | "verify";
    code?: string;
  };
  const action = resolveSudoAction(payload);

  if (action === "request") {
    const latest = await getLatestActiveSudoChallenge(input.user.id);
    if (isSudoChallengeRateLimited(latest?.createdAt ?? null)) {
      return NextResponse.json(
        { error: "Please wait before requesting another code." },
        { status: 429 }
      );
    }

    const challenge = await createSudoChallenge(input.user.id);
    try {
      await sendSudoVerificationCodeEmail({
        toEmail: input.user.email,
        code: challenge.code,
        expiresInMinutes: Math.floor(SUDO_CHALLENGE_TTL_SECONDS / 60),
      });
    } catch {
      await invalidateSudoChallenge(challenge.id);
      return NextResponse.json(
        { error: "Unable to send verification code." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      expiresInSeconds: SUDO_CHALLENGE_TTL_SECONDS,
    });
  }

  if (action === "verify") {
    const code = normalizeSudoCode(payload.code);
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Invalid code format." },
        { status: 400 }
      );
    }

    const result = await verifySudoCode({ userId: input.user.id, code });
    if (!result.ok) {
      return NextResponse.json(
        { error: "Invalid or expired code." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      expiresAt: result.expiresAt.toISOString(),
    });
    response.cookies.set({
      name: SUDO_COOKIE_NAME,
      value: result.cookieValue,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SUDO_SESSION_TTL_SECONDS,
    });
    return response;
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
