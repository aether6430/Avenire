import { CheckIcon } from "@/components/marketing/icons/card-icons";
import { CloseIcon } from "@/components/marketing/icons/general";
import { BILLING_PLANS } from "@/lib/billing-plans";

export const TIER_NAMES = {
  TIER_1: "Access",
  TIER_2: "Core",
  TIER_3: "Scholar",
} as const;

export type TierName = (typeof TIER_NAMES)[keyof typeof TIER_NAMES];

export const tiers = [
  {
    title: TIER_NAMES.TIER_1,
    subtitle: "Start learning with AI",
    monthly: BILLING_PLANS.access.monthly,
    yearly: BILLING_PLANS.access.yearly,
    ctaText: "Start free",
    ctaLink: "/waitlist",
    features: BILLING_PLANS.access.features,
  },
  {
    title: TIER_NAMES.TIER_2,
    subtitle: "For daily study workflows",
    monthly: BILLING_PLANS.core.monthly,
    yearly: BILLING_PLANS.core.yearly,
    ctaText: "Join the waitlist",
    ctaLink: "/waitlist",
    features: BILLING_PLANS.core.features,
    featured: true,
  },
  {
    title: TIER_NAMES.TIER_3,
    subtitle: "For research heavy work",
    monthly: BILLING_PLANS.scholar.monthly,
    yearly: BILLING_PLANS.scholar.yearly,
    ctaText: "Join the waitlist",
    ctaLink: "/waitlist",
    features: BILLING_PLANS.scholar.features,
  },
];

export const pricingTable = [
  {
    title: "Core AI methods workspace",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Apollo AI tutor",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Apollo credits",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: BILLING_PLANS.access.chatCredits,
      },
      {
        title: TIER_NAMES.TIER_2,
        value: BILLING_PLANS.core.chatCredits,
      },
      {
        title: TIER_NAMES.TIER_3,
        value: BILLING_PLANS.scholar.chatCredits,
      },
    ],
  },
  {
    title: "Storage",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: BILLING_PLANS.access.storage,
      },
      {
        title: TIER_NAMES.TIER_2,
        value: BILLING_PLANS.core.storage,
      },
      {
        title: TIER_NAMES.TIER_3,
        value: BILLING_PLANS.scholar.storage,
      },
    ],
  },
  {
    title: "Interactive concept widgets",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Misconception detection",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Mindset Sets",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Priority response queue",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Response speed",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: "Standard",
      },
      {
        title: TIER_NAMES.TIER_2,
        value: "Priority",
      },
      {
        title: TIER_NAMES.TIER_3,
        value: "Priority",
      },
    ],
  },
  {
    title: "Mastery tracking & analytics",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_2,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Custom study plans",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_2,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Early experimental features",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_2,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TIER_NAMES.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
];
