"use client";

import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import { cn } from "@avenire/ui/lib/utils";
import { ArrowRight, Lock, Envelope as Mail } from "@phosphor-icons/react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authClient, requestPasswordReset, signIn } from "../client";
import { getErrorMessage } from "../error_codes";
import { getWaitlistErrorDetails } from "../waitlist-shared";
import { GithubIcon, GoogleIcon, LoadingIcon, PasskeyIcon } from "./icons";

const loginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .nonempty("Email is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .nonempty("Password is required"),
});

const socialButtonClassName =
  "relative h-11 w-full rounded-2xl border-border/60 bg-muted/30 text-foreground/80 shadow-none transition-colors hover:border-border hover:bg-muted/55";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-[11px] text-destructive leading-relaxed">{message}</p>
  );
}

export function LoginForm({
  callbackURL = "/workspace",
  className,
  initialEmail = "",
  initialError,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  callbackURL?: string;
  initialEmail?: string;
  initialError?: string | null;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<
    | {
        email: string | undefined;
        password: string | undefined;
      }
    | undefined
  >(undefined);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);
  const [canJoinWaitlist, setCanJoinWaitlist] = useState(false);
  const lastLoginMethod = authClient.getLastUsedLoginMethod();

  useEffect(() => {
    if (!PublicKeyCredential.isConditionalMediationAvailable?.()) {
      return;
    }

    signIn.passkey({ autoFill: true, callbackURL });
  }, [callbackURL]);

  useEffect(() => {
    const details = getWaitlistErrorDetails(initialError);

    setWaitlistMessage(details?.message ?? null);
    setCanJoinWaitlist(details?.canJoinWaitlist ?? false);
  }, [initialError]);

  const resetWaitlistFeedback = () => {
    setWaitlistMessage(null);
    setCanJoinWaitlist(false);
  };

  const getErrorCallbackURL = () => {
    const params = new URLSearchParams();
    if (email.trim()) {
      params.set("email", email.trim());
    }
    if (callbackURL && callbackURL !== "/workspace") {
      params.set("callbackURL", callbackURL);
    }

    const query = params.toString();
    return query ? `/login?${query}` : "/login";
  };

  const handleJoinWaitlist = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrors({ email: "Email is required", password: undefined });
      return;
    }

    setIsJoiningWaitlist(true);
    try {
      const response = await fetch("/api/waitlist/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!response.ok) {
        throw new Error("Unable to join the waitlist.");
      }

      const payload = (await response.json()) as {
        status?: "pending" | "approved" | "registered";
      };

      const nextMessage =
        payload.status === "approved" || payload.status === "registered"
          ? "This email already has access."
          : "You're on the waitlist now. We’ll email you when access opens.";

      setWaitlistMessage(nextMessage);
      setCanJoinWaitlist(false);
      toast("You're on the waitlist", {
        description: `We saved ${trimmedEmail} for access.`,
      });
    } catch (error) {
      toast.error("Oops! Something went wrong", {
        description:
          error instanceof Error
            ? error.message
            : "Unable to join the waitlist.",
      });
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors(undefined);
    resetWaitlistFeedback();

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const formattedErrors = result.error.format();
      setErrors({
        email: formattedErrors.email?._errors.join(", "),
        password: formattedErrors.password?._errors.join(", "),
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signIn.email({
      email,
      password,
      callbackURL,
    });

    if (error) {
      const errorMessage = getErrorMessage(error.code || "", error.message);
      if (errorMessage.source === "email") {
        setErrors({ email: errorMessage.userMessage, password: undefined });
      }

      const details =
        getWaitlistErrorDetails(error.code?.toLowerCase()) ??
        getWaitlistErrorDetails(error.message?.toLowerCase());
      if (details) {
        setWaitlistMessage(details.message);
        setCanJoinWaitlist(details.canJoinWaitlist);
      }

      toast.error("Oops! Something went wrong", {
        description: errorMessage.userMessage,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  return (
    <form
      className={cn("p-5 md:p-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
            Welcome back
          </p>
          <h1 className="font-semibold text-3xl tracking-tight">Sign in</h1>
          <p className="text-muted-foreground text-sm">Sign in to continue.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium text-sm" htmlFor="email">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoComplete="email webauthn"
                className="pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                id="email"
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (waitlistMessage || canJoinWaitlist) {
                    resetWaitlistFeedback();
                  }
                }}
                placeholder="m@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            <FieldError message={errors?.email} />
            {waitlistMessage ? (
              <p className="text-muted-foreground text-xs">{waitlistMessage}</p>
            ) : null}
            {canJoinWaitlist ? (
              <Button
                className="w-full sm:w-auto"
                disabled={isJoiningWaitlist}
                onClick={() => {
                  void handleJoinWaitlist();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {isJoiningWaitlist
                  ? "Joining the waitlist..."
                  : "Join the waitlist"}
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium text-sm" htmlFor="password">
                Password
              </Label>
              <Button
                className="text-primary text-sm transition-all hover:text-primary/80"
                onClick={async () => {
                  if (!email) {
                    setErrors({
                      email: "Email is required",
                      password: undefined,
                    });
                    return;
                  }

                  const { error } = await requestPasswordReset({
                    email,
                    redirectTo: "/change-password",
                  });

                  if (error) {
                    const errorMessage = getErrorMessage(
                      error.code || "",
                      error.message
                    );
                    if (errorMessage.source === "email") {
                      setErrors({
                        email: errorMessage.userMessage,
                        password: undefined,
                      });
                    }
                    toast.error("Oops! Something went wrong", {
                      description: errorMessage.userMessage,
                    });
                    return;
                  }

                  toast("Check your mail!", {
                    description: `We have just sent an email to ${email}. Proceed from the link in the mail`,
                  });
                }}
                type="button"
                variant="link"
              >
                Forgot password?
              </Button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoComplete="current-password webauthn"
                className="pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            <FieldError message={errors?.password} />
          </div>
        </div>

        <Button
          className="group transition-all"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <LoadingIcon />
              Logging in...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              Login
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          )}
        </Button>

        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-border after:border-t">
          <span className="relative z-10 bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Button
            className={cn(socialButtonClassName, "justify-center")}
            onClick={() => {
              signIn.social({
                provider: "google",
                callbackURL,
                errorCallbackURL: getErrorCallbackURL(),
              });
            }}
            type="button"
            variant="outline"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center">
              <GoogleIcon />
            </span>
            {lastLoginMethod === "google" ? (
              <span className="absolute top-1 right-1 rounded-[3px] border border-primary/25 bg-primary/10 px-1 py-0.5 font-mono text-[7px] text-primary leading-none">
                Last used
              </span>
            ) : null}
            <span className="sr-only">Login with Google</span>
          </Button>
          <Button
            className={cn(socialButtonClassName, "justify-center")}
            onClick={() => {
              signIn.social({
                provider: "github",
                callbackURL,
                errorCallbackURL: getErrorCallbackURL(),
              });
            }}
            type="button"
            variant="outline"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center">
              <GithubIcon />
            </span>
            {lastLoginMethod === "github" ? (
              <span className="absolute top-1 right-1 rounded-[3px] border border-primary/25 bg-primary/10 px-1 py-0.5 font-mono text-[7px] text-primary leading-none">
                Last used
              </span>
            ) : null}
            <span className="sr-only">Login with Github</span>
          </Button>
          <Button
            className={cn(socialButtonClassName, "justify-center")}
            onClick={async () => {
              resetWaitlistFeedback();
              const data = await signIn.passkey({
                callbackURL,
                errorCallbackURL: getErrorCallbackURL(),
              });
              if (data?.error) {
                const errorCode =
                  typeof (data.error as { code?: unknown }).code === "string"
                    ? (data.error as { code: string }).code
                    : "";
                const rawErrorMessage = data.error.message;
                const errorMessageText =
                  typeof rawErrorMessage === "string"
                    ? rawErrorMessage
                    : rawErrorMessage?.message;
                const errorMessage = getErrorMessage(
                  errorCode,
                  errorMessageText
                );
                const details =
                  getWaitlistErrorDetails(errorCode.toLowerCase()) ??
                  getWaitlistErrorDetails(errorMessageText?.toLowerCase());

                if (details) {
                  setWaitlistMessage(details.message);
                  setCanJoinWaitlist(details.canJoinWaitlist);
                }

                toast.error("Oops! Something went wrong", {
                  description: errorMessage.userMessage,
                });
              }
            }}
            type="button"
            variant="outline"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center">
              <PasskeyIcon />
            </span>
            {lastLoginMethod === "passkey" ? (
              <span className="absolute top-1 right-1 rounded-[3px] border border-primary/25 bg-primary/10 px-1 py-0.5 font-mono text-[7px] text-primary leading-none">
                Last used
              </span>
            ) : null}
            <span className="sr-only">Login with Passkey</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
