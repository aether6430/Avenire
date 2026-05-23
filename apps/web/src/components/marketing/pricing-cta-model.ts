import {
  TIER_NAMES,
  type TierName,
} from "@/components/marketing/constants/pricing";
import type { BillingCycle } from "@/lib/billing-plans";

export type PricingCallToAction =
  | {
      href: string;
      kind: "link";
      label: string;
    }
  | {
      checkoutSlug: string;
      fallbackHref: string;
      kind: "checkout";
      label: string;
    };

export function resolvePricingCallToAction({
  cycle,
  isSignedIn,
  signedOutHref,
  signedOutLabel,
  tierName,
}: {
  cycle: BillingCycle;
  isSignedIn: boolean;
  signedOutHref: string;
  signedOutLabel: string;
  tierName: TierName;
}): PricingCallToAction {
  if (!isSignedIn) {
    return {
      href: signedOutHref,
      kind: "link",
      label: signedOutLabel,
    };
  }

  if (tierName === TIER_NAMES.TIER_1) {
    return {
      href: "/workspace",
      kind: "link",
      label: "Go to app",
    };
  }

  if (tierName === TIER_NAMES.TIER_2) {
    return {
      checkoutSlug: `core-${cycle}`,
      fallbackHref: `/api/billing/checkout?plan=core&billing=${cycle}`,
      kind: "checkout",
      label: "Upgrade",
    };
  }

  return {
    checkoutSlug: `scholar-${cycle}`,
    fallbackHref: `/api/billing/checkout?plan=scholar&billing=${cycle}`,
    kind: "checkout",
    label: "Upgrade",
  };
}
