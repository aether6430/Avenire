const TIME_WINDOWS = {
  dawn: [5, 8],
  morning: [8, 12],
  afternoon: [12, 17],
  evening: [17, 22],
} as const;

type GreetingSurface = "chat" | "workspace";

const CHAT_VERBS = [
  "tinker",
  "brainstorm",
  "untangle",
  "ship",
  "explore",
  "debug",
  "create",
];

const WORKSPACE_VERBS = [
  "focus",
  "plan",
  "review",
  "build",
  "prioritize",
  "polish",
  "progress",
];

function getTimeLabel(hour = new Date().getHours()) {
  if (hour >= TIME_WINDOWS.dawn[0] && hour < TIME_WINDOWS.dawn[1]) {
    return "Early Bird";
  }
  if (hour >= TIME_WINDOWS.morning[0] && hour < TIME_WINDOWS.morning[1]) {
    return "Morning";
  }
  if (hour >= TIME_WINDOWS.afternoon[0] && hour < TIME_WINDOWS.afternoon[1]) {
    return "Afternoon";
  }
  if (hour >= TIME_WINDOWS.evening[0] && hour < TIME_WINDOWS.evening[1]) {
    return "Evening";
  }
  return "Night Owl";
}

function getFormalPeriod(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 12) {
    return "Morning";
  }
  if (hour >= 12 && hour < 17) {
    return "Afternoon";
  }
  if (hour >= 17 && hour < 22) {
    return "Evening";
  }
  return "Night";
}

function stableIndex(seed: string, size: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 2_147_483_647;
  }
  return Math.abs(hash) % size;
}

export function buildGreeting(
  userName?: string,
  surface: GreetingSurface = "chat"
) {
  const name = userName?.trim() || "Friend";
  const now = new Date();
  const daySeed = now.toISOString().slice(0, 10);
  const hourSeed = now.getHours();
  const minuteBucket = Math.floor(now.getMinutes() / 5);
  const timeLabel = getTimeLabel(now.getHours());
  const formalPeriod = getFormalPeriod(now.getHours());
  const verbs = surface === "chat" ? CHAT_VERBS : WORKSPACE_VERBS;
  const verb =
    verbs[
      stableIndex(`${daySeed}:${hourSeed}:${name}:${surface}`, verbs.length)
    ];

  const headlines =
    surface === "chat"
      ? [
          `${timeLabel} Spark, ${name}!`,
          `Let's ${verb.toUpperCase()} this, ${name}!`,
          `Boom! ${name}, ready to ${verb}?`,
          `${name}, Big Ideas Start Here!`,
          `Let's Make Magic, ${name}!`,
        ]
      : [
          `Good ${formalPeriod}, ${name}!`,
          `Welcome Back, ${name}!`,
          `${name}, Ready to ${verb}?`,
          `${name}, Let's Have a Great Session!`,
          `Let's Go, ${name}!`,
        ];

  const descriptions =
    surface === "chat"
      ? [
          `This ${timeLabel} is perfect for bold thinking!`,
          "Drop a prompt and let's build something brilliant!",
          `Let's ${verb} something meaningful together!`,
        ]
      : [
          "Your workspace is ready.",
          "Tasks, weak points, and reviews are lined up.",
          `Time to ${verb} your priorities.`,
        ];

  const headline =
    headlines[
      stableIndex(
        `${daySeed}:${hourSeed}:headline:${name}:${surface}:${minuteBucket}`,
        headlines.length
      )
    ];
  const description =
    descriptions[
      stableIndex(
        `${daySeed}:${hourSeed}:description:${name}:${surface}:${minuteBucket}`,
        descriptions.length
      )
    ];

  return { description, headline };
}
