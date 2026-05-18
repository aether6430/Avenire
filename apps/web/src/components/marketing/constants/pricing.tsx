import { CheckIcon } from "@/components/marketing/icons/card-icons";
import { CloseIcon } from "@/components/marketing/icons/general";
import { BILLING_PLANS } from "@/lib/billing-plans";

export enum TierName {
  TIER_1 = "Access",
  TIER_2 = "Core",
  TIER_3 = "Scholar",
}

export const tiers = [
  {
    title: TierName.TIER_1,
    subtitle: "Start learning with AI",
    monthly: BILLING_PLANS.access.monthly,
    yearly: BILLING_PLANS.access.yearly,
    ctaText: "Start free",
    ctaLink: "/waitlist",
    features: [
      "220 chat credits",
      "2 GB storage",
      "Basic flashcard generation",
      "Interactive graphs, limited",
      "Whiteboard reasoning tools",
      "Community prompt library",
      "Standard response speed",
      "One personal workspace",
    ],
  },
  {
    title: TierName.TIER_2,
    subtitle: "For daily study workflows",
    monthly: BILLING_PLANS.core.monthly,
    yearly: BILLING_PLANS.core.yearly,
    ctaText: "Join waitlist",
    ctaLink: "/waitlist",
    features: [
      "Everything in Access",
      "1,880 chat credits",
      "15 GB storage",
      "Advanced reasoning sessions",
      "Full graph and plot tools",
      "More database columns",
      "Priority generation queue",
    ],
    featured: true,
  },
  {
    title: TierName.TIER_3,
    subtitle: "For research heavy work",
    monthly: BILLING_PLANS.scholar.monthly,
    yearly: BILLING_PLANS.scholar.yearly,
    ctaText: "Join waitlist",
    ctaLink: "/waitlist",
    features: [
      "Everything in Core",
      "6,680 chat credits",
      "50 GB storage",
      "Deep Research synthesis",
      "AI video explanations",
      "Document research workflows",
      "Mastery tracking analytics",
      "Maximum database columns",
      "Custom study plans",
      "Early experimental features",
    ],
  },
];

export const pricingTable = [
  {
    title: "Workspace seats",
    tiers: [
      {
        title: TierName.TIER_1,
        value: "1",
      },
      {
        title: TierName.TIER_2,
        value: "1",
      },
      {
        title: TierName.TIER_3,
        value: "3",
      },
    ],
  },
  {
    title: "Two-factor authentication",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "AI file and note search",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Deep Research mode",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Chat credits",
    tiers: [
      {
        title: TierName.TIER_1,
        value: "220",
      },
      {
        title: TierName.TIER_2,
        value: "1,880",
      },
      {
        title: TierName.TIER_3,
        value: "6,680",
      },
    ],
  },
  {
    title: "Storage",
    tiers: [
      {
        title: TierName.TIER_1,
        value: "2 GB",
      },
      {
        title: TierName.TIER_2,
        value: "15 GB",
      },
      {
        title: TierName.TIER_3,
        value: "50 GB",
      },
    ],
  },
  {
    title: "Video explanations",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Database columns",
    tiers: [
      {
        title: TierName.TIER_1,
        value: "Standard",
      },
      {
        title: TierName.TIER_2,
        value: "Expanded",
      },
      {
        title: TierName.TIER_3,
        value: "Maximum",
      },
    ],
  },
  {
    title: "Custom study plans",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: "Unlimited",
      },
    ],
  },
  {
    title: "Priority generation",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Experimental features",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Support",
    tiers: [
      {
        title: TierName.TIER_1,
        value: "Community",
      },
      {
        title: TierName.TIER_2,
        value: "Priority",
      },
      {
        title: TierName.TIER_3,
        value: "Priority",
      },
    ],
  },
];
