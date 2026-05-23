import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "./components/change-password";
import * as Icons from "./components/icons";
import { RegisterForm } from "./components/register";
import { WaitlistForm } from "./components/waitlist";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue("token_123"),
  }),
}));

vi.mock("./client", () => ({
  authClient: {
    getLastUsedLoginMethod: vi.fn(() => null),
  },
  resetPassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  signIn: {
    passkey: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
  }),
}));

describe("@avenire/auth component smoke", () => {
  it("renders auth icons and forms to static markup", () => {
    const loginSource = readFileSync(
      path.resolve(import.meta.dirname, "./components/login.tsx"),
      "utf8"
    );
    const registerSource = readFileSync(
      path.resolve(import.meta.dirname, "./components/register.tsx"),
      "utf8"
    );
    const waitlistSource = readFileSync(
      path.resolve(import.meta.dirname, "./components/waitlist.tsx"),
      "utf8"
    );
    const iconMarkup = renderToStaticMarkup(
      <div>
        <Icons.GithubIcon />
        <Icons.GoogleIcon />
        <Icons.LoadingIcon />
        <Icons.PasskeyIcon />
      </div>
    );
    const waitlistMarkup = renderToStaticMarkup(<WaitlistForm />);
    const registerMarkup = renderToStaticMarkup(<RegisterForm />);
    const changePasswordMarkup = renderToStaticMarkup(<ChangePasswordForm />);

    expect(iconMarkup).toContain("lucide-github");
    expect(iconMarkup).toContain("animate-spin");
    expect(iconMarkup).toContain("key-round");
    expect(registerMarkup).toContain("Create an account");
    expect(registerMarkup).toContain("Create account");
    expect(registerMarkup).toContain("Or continue with");
    expect(registerMarkup).toContain("Google");
    expect(registerMarkup).toContain("GitHub");
    expect(registerMarkup).toContain("Already have an account?");
    expect(registerSource).toContain("currentClockNow = 0");
    expect(registerSource).toContain("auth:verification-resend-cooldown");
    expect(registerSource).toContain("Verify your email");
    expect(registerSource).toContain("Resend verification email");
    expect(registerSource).toContain("resendCooldownSecondsRemaining > 0");
    expect(registerSource).toContain("Resend available in ");
    expect(registerSource).toContain("Verification email sent");
    expect(registerSource).toContain("Last used");
    expect(registerSource).toContain("getLastUsedLoginMethod()");
    expect(registerSource).toContain('provider: "google"');
    expect(registerSource).toContain('provider: "github"');
    expect(registerSource).toContain("sendVerificationEmail({");
    expect(waitlistMarkup).toContain("Request access");
    expect(waitlistMarkup).toContain("Join the waitlist");
    expect(waitlistMarkup).toContain("m@example.com");
    expect(waitlistSource).toContain("Join the waitlist");
    expect(waitlistSource).toContain("Joining the waitlist...");
    expect(waitlistSource).not.toContain('"Join waitlist"');
    expect(waitlistSource).not.toContain('"Joining waitlist..."');
    expect(loginSource).toContain("Join the waitlist");
    expect(loginSource).toContain("Joining the waitlist...");
    expect(loginSource).not.toContain('"Join waitlist"');
    expect(loginSource).not.toContain('"Joining waitlist..."');
    expect(changePasswordMarkup).toContain("Change Password");
    expect(changePasswordMarkup).toContain("New Password");
    expect(changePasswordMarkup).toContain("Confirm New Password");
  });
});
