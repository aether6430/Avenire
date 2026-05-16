import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "./components/change-password";
import * as Icons from "./components/icons";
import { WaitlistForm } from "./components/waitlist";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue("token_123"),
  }),
}));

vi.mock("./client", () => ({
  resetPassword: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
  }),
}));

describe("@avenire/auth component smoke", () => {
  it("renders auth icons and forms to static markup", () => {
    const iconMarkup = renderToStaticMarkup(
      <div>
        <Icons.GithubIcon />
        <Icons.GoogleIcon />
        <Icons.LoadingIcon />
        <Icons.PasskeyIcon />
      </div>
    );
    const waitlistMarkup = renderToStaticMarkup(<WaitlistForm />);
    const changePasswordMarkup = renderToStaticMarkup(<ChangePasswordForm />);

    expect(iconMarkup).toContain("lucide-github");
    expect(iconMarkup).toContain("animate-spin");
    expect(iconMarkup).toContain("key-round");
    expect(waitlistMarkup).toContain("Request access");
    expect(waitlistMarkup).toContain("Join the waitlist");
    expect(waitlistMarkup).toContain("m@example.com");
    expect(changePasswordMarkup).toContain("Change Password");
    expect(changePasswordMarkup).toContain("New Password");
    expect(changePasswordMarkup).toContain("Confirm New Password");
  });
});
