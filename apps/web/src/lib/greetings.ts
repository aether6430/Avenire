const TIME_WINDOWS = {
  dawn: [5, 8],
  morning: [8, 12],
  afternoon: [12, 17],
  evening: [17, 22],
} as const;

type GreetingSurface = "chat" | "workspace";

const CHAT_VERBS = [
  "beboppin'",
  "boondoggling",
  "booping",
  "cerebrating",
  "cogitating",
  "discombobulating",
  "fiddle-faddling",
  "flibbertigibbeting",
  "hyperspacing",
  "lollygagging",
  "quantumizing",
  "razzle-dazzling",
  "ruminating",
  "synthesizing",
  "tomfoolering",
  "vibe coding",
  "wibbling",
  "zigzagging",
];

const WORKSPACE_VERBS = [
  "baking",
  "brewing",
  "caramelizing",
  "clauding",
  "crystallizing",
  "fermenting",
  "flambéing",
  "gallivanting",
  "garnishing",
  "gitifying",
  "ionizing",
  "kneading",
  "marinating",
  "nebulizing",
  "osmosing",
  "perambulating",
  "percolating",
  "photosynthesizing",
  "spelunking",
  "stewing",
  "sublimating",
  "transmuting",
  "whisking",
];

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
  const timeKey = getTimeKey(now.getHours());
  const formalPeriod = getFormalPeriod(now.getHours());
  const verbs = surface === "chat" ? CHAT_VERBS : WORKSPACE_VERBS;
  const verb =
    verbs[
      stableIndex(`${daySeed}:${hourSeed}:${name}:${surface}`, verbs.length)
    ];

  const headlines =
    surface === "chat"
      ? [
          `${timeLabel} spark, ${name}`,
          `${name}, we're ${verb} now`,
          `${name}, what are we ${verb} today?`,
          `${formalPeriod} brain online, ${name}`,
          `${name}, bring the weird useful idea`,
        ]
      : [
          `Good ${formalPeriod}, ${name}`,
          `Welcome back, ${name}`,
          `${name}, today's workspace is ${verb}`,
          `${formalPeriod} session, ${name}`,
          `${name}, let's sort the useful chaos`,
        ];

  const timePrompts = TIME_PROMPTS[timeKey];
  const descriptions =
    surface === "chat"
      ? [
          timePrompts[
            stableIndex(
              `${daySeed}:${hourSeed}:time:${name}:chat`,
              timePrompts.length
            )
          ],
          `Drop a prompt and we can start ${verb}.`,
          `This ${timeLabel.toLowerCase()} is good for questions with edges.`,
        ]
      : [
          timePrompts[
            stableIndex(
              `${daySeed}:${hourSeed}:time:${name}:workspace`,
              timePrompts.length
            )
          ],
          "Tasks, recent concepts, and reviews are lined up.",
          `Time for a little ${verb} across your priorities.`,
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
