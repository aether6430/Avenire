import { WaitlistPageClient } from "@/components/auth/waitlist-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Join the Avenire waitlist for early access to an AI learning workspace built for deep study and research.",
  path: "/waitlist",
  title: "Join the waitlist",
});

export default function WaitlistPage() {
  return <WaitlistPageClient />;
}
