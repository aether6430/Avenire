const TIME_WINDOWS = {
  dawn: [5, 8],
  morning: [8, 12],
  afternoon: [12, 17],
  evening: [17, 22],
} as const;

const TIME_PROMPTS = {
  dawn: [
    "The world is still booting. Perfect time for quiet momentum.",
    "Early hours, low noise, clean context.",
  ],
  morning: [
    "Fresh brain, fresh tab, decent odds.",
    "Morning energy is useful. Spend it deliberately.",
  ],
  afternoon: [
    "The afternoon stretch is for turning loose ends into finished work.",
    "Midday context is loaded. Time to make it count.",
  ],
  evening: [
    "Evening mode: lower the noise and keep the useful thread.",
    "Good hour for thoughtful edits and small wins.",
  ],
  night: [
    "Night owl mode. Keep it sharp, not heroic.",
    "Late session detected. We can still be precise.",
  ],
} as const;

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

function getTimeKey(hour = new Date().getHours()): keyof typeof TIME_PROMPTS {
  if (hour >= TIME_WINDOWS.dawn[0] && hour < TIME_WINDOWS.dawn[1]) {
    return "dawn";
  }
  if (hour >= TIME_WINDOWS.morning[0] && hour < TIME_WINDOWS.morning[1]) {
    return "morning";
  }
  if (hour >= TIME_WINDOWS.afternoon[0] && hour < TIME_WINDOWS.afternoon[1]) {
    return "afternoon";
  }
  if (hour >= TIME_WINDOWS.evening[0] && hour < TIME_WINDOWS.evening[1]) {
    return "evening";
  }
  return "night";
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
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 2_147_483_647;
  }
  return Math.abs(hash) % size;
}

export function buildWorkspaceGreeting(userName?: string) {
  const name = userName?.trim() || "Friend";
  const now = new Date();
  const daySeed = now.toISOString().slice(0, 10);
  const hourSeed = now.getHours();
  const minuteBucket = Math.floor(now.getMinutes() / 5);
  const timeLabel = getTimeLabel(now.getHours());
  const timeKey = getTimeKey(now.getHours());
  const formalPeriod = getFormalPeriod(now.getHours());

  const headlines = [
    `Good ${formalPeriod}, ${name}`,
    `Welcome back, ${name}`,
    `${name}, here's what's ready`,
    `${formalPeriod} session, ${name}`,
    `${name}, let's focus the next step`,
  ];

  const timePrompts = TIME_PROMPTS[timeKey];
  const descriptions = [
    timePrompts[
      stableIndex(
        `${daySeed}:${hourSeed}:time:${name}:workspace`,
        timePrompts.length
      )
    ],
    "Tasks, recent concepts, and reviews are lined up.",
    `This ${timeLabel.toLowerCase()} is good for a focused next step.`,
  ];

  const headline =
    headlines[
      stableIndex(
        `${daySeed}:${hourSeed}:headline:${name}:workspace:${minuteBucket}`,
        headlines.length
      )
    ];
  const description =
    descriptions[
      stableIndex(
        `${daySeed}:${hourSeed}:description:${name}:workspace:${minuteBucket}`,
        descriptions.length
      )
    ];

  return { description, headline };
}
