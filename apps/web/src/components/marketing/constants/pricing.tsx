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
      "330 Apollo credits",
      "2 GB storage",
      "Full workspace with file & note search",
      "Apollo AI tutor",
      "Interactive concept widgets",
      "Misconception detection",
      "Flashcards with spaced repetition",
      "Standard response speed",
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
      "1,880 Apollo credits",
      "15 GB storage",
      "Priority response queue",
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
      "6,680 Apollo credits",
      "50 GB storage",
      "Mastery tracking & analytics",
      "Custom study plans",
      "Early experimental features",
    ],
  },
];

export const pricingTable = [
  {
    title: "Full workspace file & note search",
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
    title: "Apollo AI tutor",
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
    title: "Apollo credits",
    tiers: [
      {
        title: TierName.TIER_1,
        value: "330",
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
    title: "Interactive concept widgets",
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
    title: "Misconception detection",
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
    title: "Flashcards with spaced repetition",
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
    title: "Priority response queue",
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
    title: "Response speed",
    tiers: [
      {
        title: TierName.TIER_1,
        value: "Standard",
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
  {
    title: "Mastery tracking & analytics",
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
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Early experimental features",
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
];
