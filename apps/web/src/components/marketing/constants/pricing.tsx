import { CheckIcon } from "@/components/marketing/icons/card-icons";
import { CloseIcon } from "@/components/marketing/icons/general";

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
    monthly: 0,
    yearly: 0,
    ctaText: "Join waitlist",
    ctaLink: "/waitlist",
    features: [
      "Core AI methods workspace",
      "Basic mindset generation",
      "Interactive graphs, limited",
      "Whiteboard reasoning tools",
      "7 day session history",
      "Community prompt library",
      "Standard response speed",
      "One personal workspace",
    ],
  },
  {
    title: TIER_NAMES.TIER_2,
    subtitle: "For daily study workflows",
    monthly: 5,
    yearly: 45,
    ctaText: "Join waitlist",
    ctaLink: "/waitlist",
    features: [
      "Everything in Access",
      "Advanced reasoning sessions",
      "Full graph and plot tools",
      "Smart spaced repetition",
      "Notebook memory across sessions",
      "Markdown and PDF export",
      "Priority generation queue",
      "Extended context windows",
    ],
    featured: true,
  },
  {
    title: TIER_NAMES.TIER_3,
    subtitle: "For research heavy work",
    monthly: 15,
    yearly: 150,
    ctaText: "Join waitlist",
    ctaLink: "/waitlist",
    features: [
      "Everything in Core",
      "Deep Research synthesis",
      "High context long sessions",
      "AI video explanations",
      "Document research workflows",
      "Mastery tracking analytics",
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
        title: TIER_NAMES.TIER_1,
        value: "1",
      },
      {
        title: TIER_NAMES.TIER_2,
        value: "1",
      },
      {
        title: TIER_NAMES.TIER_3,
        value: "3",
      },
    ],
  },
  {
    title: "Two-factor authentication",
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
    title: "AI file and note search",
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
    title: "Deep Research mode",
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
    title: "Monthly AI credits",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: "Starter",
      },
      {
        title: TIER_NAMES.TIER_2,
        value: "Expanded",
      },
      {
        title: TIER_NAMES.TIER_3,
        value: "Unlimited",
      },
    ],
  },
  {
    title: "Markdown and PDF export",
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
    title: "Session history",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: "7 days",
      },
      {
        title: TIER_NAMES.TIER_2,
        value: "Unlimited",
      },
      {
        title: TIER_NAMES.TIER_3,
        value: "Unlimited",
      },
    ],
  },
  {
    title: "Spaced repetition",
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
    title: "Video explanations",
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
    title: "Context window",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: "Basic",
      },
      {
        title: TIER_NAMES.TIER_2,
        value: "Extended",
      },
      {
        title: TIER_NAMES.TIER_3,
        value: "Unlimited",
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
        value: "Unlimited",
      },
    ],
  },
  {
    title: "Priority generation",
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
    title: "Experimental features",
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
    title: "Workspace notebooks",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: "1",
      },
      {
        title: TIER_NAMES.TIER_2,
        value: "5",
      },
      {
        title: TIER_NAMES.TIER_3,
        value: "Unlimited",
      },
    ],
  },
  {
    title: "Support",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: "Community",
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
    title: "Mindset Sets",
    tiers: [
      {
        title: TIER_NAMES.TIER_1,
        value: "3",
      },
      {
        title: TIER_NAMES.TIER_2,
        value: "Unlimited",
      },
      {
        title: TIER_NAMES.TIER_3,
        value: "Unlimited",
      },
    ],
  },
];
