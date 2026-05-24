"use client";

import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import {
  Warning as AlertCircle,
  ArrowRight,
  Lock,
  Envelope as Mail,
  Envelope as MailIcon,
  User,
} from "@phosphor-icons/react";
import Link from "next/link";
import type React from "react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authClient, sendVerificationEmail, signIn, signUp } from "../client";
import { getErrorMessage } from "../error_codes";
import { GithubIcon, GoogleIcon, LoadingIcon } from "./icons";

const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
const VERIFICATION_EMAIL_STORAGE_KEY = "auth:verification-email";

const socialButtonClassName =
  "relative h-11 w-full justify-center gap-2 rounded-2xl border-border/60 bg-muted/30 text-foreground/80 shadow-none transition-colors hover:border-border hover:bg-muted/55";

const clockSubscribers = new Set<() => void>();
let clockInterval: number | null = null;
let currentClockNow = 0;

function subscribeToClock(callback: () => void) {
  clockSubscribers.add(callback);
  currentClockNow = Date.now();

  if (!clockInterval) {
    clockInterval = window.setInterval(() => {
      currentClockNow = Date.now();
      clockSubscribers.forEach((subscriber) => subscriber());
    }, 1000);
  }

  return () => {
    clockSubscribers.delete(callback);

    if (!clockSubscribers.size && clockInterval) {
      window.clearInterval(clockInterval);
      clockInterval = null;
    }
  };
}

function useClockNow() {
  return useSyncExternalStore(
    subscribeToClock,
    () => currentClockNow,
    () => 0
  );
}

function getVerificationCooldownStorageKey(email: string) {
  return `auth:verification-resend-cooldown:${email}`;
}

function readStoredVerificationCooldown(email: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const storedDeadline = window.localStorage.getItem(
    getVerificationCooldownStorageKey(email)
  );
  if (!storedDeadline) {
    return null;
  }

  const parsedDeadline = Number.parseInt(storedDeadline, 10);
  if (!Number.isFinite(parsedDeadline) || parsedDeadline <= Date.now()) {
    return null;
  }

  return parsedDeadline;
}

const registerSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email address")
      .nonempty("Email is required"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters long")
      .max(20, "Username must be at most 20 characters long")
      .regex(
        /^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9_.]+$/,
        "Username can only contain letters, numbers, underscores, and periods, and cannot end with a period"
      )
      .nonempty("Username is required"),
    displayname: z.string().optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .nonempty("Password is required"),
    confirmPassword: z.string().nonempty("Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-[11px] text-destructive leading-relaxed">{message}</p>
  );
}

export function RegisterForm({
  callbackURL = "/workspace",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  callbackURL?: string;
}) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [verificationEmail, setVerificationEmail] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(VERIFICATION_EMAIL_STORAGE_KEY) ?? "";
  });
  const [username, setUsername] = useState("");
  const [displayname, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(
    () => {
      const storedEmail =
        typeof window === "undefined"
          ? ""
          : (window.localStorage.getItem(VERIFICATION_EMAIL_STORAGE_KEY) ?? "");

      return storedEmail ? readStoredVerificationCooldown(storedEmail) : null;
    }
  );
  const [isResendingVerificationEmail, setIsResendingVerificationEmail] =
    useState(false);
  const [errors, setErrors] = useState<
    | {
        email: string | undefined;
        username: string | undefined;
        password: string | undefined;
        confirmPassword: string | undefined;
        displayname?: string | undefined;
      }
    | undefined
  >(undefined);
  const lastLoginMethod = authClient.getLastUsedLoginMethod();
  const clockNow = useClockNow();
  const submittedVerificationEmail = verificationEmail.trim().toLowerCase();
  const resendCooldownSecondsRemaining = resendAvailableAt
    ? Math.max(0, Math.ceil((resendAvailableAt - clockNow) / 1000))
    : 0;
  const canResendVerificationEmail =
    isSubmitted &&
    Boolean(submittedVerificationEmail) &&
    !isResendingVerificationEmail &&
    resendCooldownSecondsRemaining === 0;

  const startVerificationResendCooldown = (emailAddress: string) => {
    const normalizedEmail = emailAddress.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    const deadline = Date.now() + VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000;
    setVerificationEmail(normalizedEmail);
    setResendAvailableAt(deadline);
    window.localStorage.setItem(
      VERIFICATION_EMAIL_STORAGE_KEY,
      normalizedEmail
    );
    window.localStorage.setItem(
      getVerificationCooldownStorageKey(normalizedEmail),
      String(deadline)
    );
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

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrors(undefined);

    const result = registerSchema.safeParse({
      email,
      username,
      displayname,
      password,
      confirmPassword,
    });

    if (!result.success) {
      const formattedErrors = result.error.format();
      setErrors({
        email: formattedErrors.email?._errors.join(", "),
        username: formattedErrors.username?._errors.join(", "),
        password: formattedErrors.password?._errors.join(", "),
        confirmPassword: formattedErrors.confirmPassword?._errors.join(", "),
        displayname: formattedErrors.displayname?._errors.join(", "),
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp.email({
      email,
      callbackURL,
      name: displayname,
      password,
      username,
    });

    if (error) {
      const errorMessage = getErrorMessage(error.code || "", error.message);
      if (errorMessage.source === "email") {
        setErrors({
          email: errorMessage.userMessage,
          username: undefined,
          password: undefined,
          confirmPassword: undefined,
        });
      } else if (errorMessage.source === "username") {
        setErrors({
          email: undefined,
          username: errorMessage.userMessage,
          password: undefined,
          confirmPassword: undefined,
        });
      }

      toast.error("Oops! Something went wrong", {
        description: errorMessage.userMessage,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    const normalizedEmail = email.trim().toLowerCase();
    setVerificationEmail(normalizedEmail);
    setIsSubmitted(true);
    startVerificationResendCooldown(normalizedEmail);
  };

  return (
    <>
      {isSubmitted ? (
        <div className="flex h-full flex-col items-center justify-center px-5 py-8 sm:px-7 sm:py-10">
          <div className="flex max-w-md flex-col items-center gap-5 text-center">
            <div className="rounded-2xl border border-border/70 bg-primary/10 p-3.5">
              <MailIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
                One more step
              </div>
              <h2 className="font-semibold text-3xl leading-tight">
                Verify your email
              </h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We&apos;ve sent a verification link to{" "}
              <span className="font-medium text-foreground">
                {email || "your email address"}
              </span>
              . Please check your inbox and click the link to complete your
              registration.
            </p>
            <div className="mt-1 w-full rounded-2xl border border-border/70 bg-muted/40 p-4 text-left">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="ml-3">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Don&apos;t see the email? Check your spam folder or try
                    again in a few minutes.
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="mt-2 h-12 w-full rounded-2xl text-sm"
              disabled={!canResendVerificationEmail}
              onClick={async () => {
                if (!canResendVerificationEmail) {
                  return;
                }

                setIsResendingVerificationEmail(true);
                try {
                  const { error } = await sendVerificationEmail({
                    email: verificationEmail || email,
                  });

                  if (error) {
                    toast.error("Oops! Something went wrong", {
                      description: getErrorMessage(
                        error.code || "",
                        error.message
                      ).userMessage,
                    });
                    return;
                  }

                  startVerificationResendCooldown(verificationEmail || email);
                  toast.success("Verification email sent", {
                    description:
                      "Check your inbox for a fresh verification link.",
                  });
                } finally {
                  setIsResendingVerificationEmail(false);
                }
              }}
              type="button"
            >
              <div className="flex items-center justify-center">
                {isResendingVerificationEmail
                  ? "Sending..."
                  : resendCooldownSecondsRemaining > 0
                    ? `Resend available in ${resendCooldownSecondsRemaining}s`
                    : "Resend verification email"}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="p-5 md:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
                New account
              </p>
              <h1 className="font-semibold text-3xl tracking-tight">
                Create an account
              </h1>
              <p className="text-muted-foreground text-sm">
                Sign up to get started with Avenire.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium text-sm" htmlFor="email">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute top-2.5 left-3 h-3 w-3 text-muted-foreground" />
                  <Input
                    aria-describedby="email-description"
                    className="pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                    id="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="m@example.com"
                    required
                    type="email"
                    value={email}
                  />
                  {errors?.email ? (
                    <p className="mt-1 text-red-500 text-xs">{errors.email}</p>
                  ) : null}
                </div>
                <span className="sr-only" id="email-description">
                  Enter your email address. We&apos;ll send a verification link
                  to this email.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium text-sm" htmlFor="username">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute top-2.5 left-3 h-3 w-3 text-muted-foreground" />
                    <Input
                      aria-describedby="username-description"
                      className="pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                      id="username"
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="johndoe"
                      required
                      type="text"
                      value={username}
                    />
                    {errors?.username ? (
                      <p className="mt-1 text-red-500 text-xs">
                        {errors.username}
                      </p>
                    ) : null}
                  </div>
                  <span className="sr-only" id="username-description">
                    Choose a unique username that will identify you on the
                    platform.
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium text-sm" htmlFor="displayName">
                    Display Name
                  </Label>
                  <Input
                    aria-describedby="displayname-description"
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                    id="displayName"
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="John Doe"
                    required
                    type="text"
                    value={displayname}
                  />
                  {errors?.displayname ? (
                    <p className="mt-1 text-red-500 text-xs">
                      {errors.displayname}
                    </p>
                  ) : null}
                  <span className="sr-only" id="displayname-description">
                    Enter your display name. This is how other users will see
                    you.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium text-sm" htmlFor="password">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute top-2.5 left-3 h-3 w-3 text-muted-foreground" />
                    <Input
                      aria-describedby="password-description"
                      className="pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                      id="password"
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      type="password"
                      value={password}
                    />
                    {errors?.password ? (
                      <p className="mt-1 text-red-500 text-xs">
                        {errors.password}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    className="font-medium text-sm"
                    htmlFor="confirmPassword"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute top-2.5 left-3 h-3 w-3 text-muted-foreground" />
                    <Input
                      aria-describedby="confirm-password-description"
                      className="pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                      id="confirmPassword"
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      required
                      type="password"
                      value={confirmPassword}
                    />
                    {errors?.confirmPassword ? (
                      <p className="mt-1 text-red-500 text-xs">
                        {errors.confirmPassword}
                      </p>
                    ) : null}
                  </div>
                  <span className="sr-only" id="confirm-password-description">
                    Re-enter your password to confirm it.
                  </span>
                </div>
              </div>
            </div>

            <Button className="w-full" disabled={isLoading} type="submit">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingIcon />
                  Creating account...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </Button>

            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-border after:border-t">
              <span className="relative z-10 bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                className={socialButtonClassName}
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
                <GoogleIcon />
                {lastLoginMethod === "google" ? (
                  <span className="absolute top-1 right-1 rounded-[3px] border border-primary/25 bg-primary/10 px-1 py-0.5 font-mono text-[7px] text-primary leading-none">
                    Last used
                  </span>
                ) : null}
                Google
              </Button>
              <Button
                className={socialButtonClassName}
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
                <GithubIcon />
                {lastLoginMethod === "github" ? (
                  <span className="absolute top-1 right-1 rounded-[3px] border border-primary/25 bg-primary/10 px-1 py-0.5 font-mono text-[7px] text-primary leading-none">
                    Last used
                  </span>
                ) : null}
                GitHub
              </Button>
            </div>

            <div className="text-center text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link
                className="font-medium text-foreground transition-colors hover:text-primary"
                href={
                  callbackURL === "/workspace"
                    ? "/login"
                    : `/login?callbackURL=${encodeURIComponent(callbackURL)}`
                }
              >
                Sign in
              </Link>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
