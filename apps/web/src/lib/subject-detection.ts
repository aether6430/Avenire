interface SubjectMatch {
  keywords: string[];
  phrases?: string[];
}

const SUBJECT_MATCHERS: Array<{
  subject: string;
  matches: SubjectMatch;
}> = [
  {
    subject: "computer_science",
    matches: {
      keywords: [
        "algorithm",
        "algorithms",
        "api",
        "binary",
        "class",
        "code",
        "compiler",
        "database",
        "debug",
        "function",
        "git",
        "hash",
        "json",
        "javascript",
        "kubernetes",
        "latency",
        "node",
        "python",
        "react",
        "sql",
        "typescript",
      ],
      phrases: ["big o", "binary search", "data structure", "time complexity"],
    },
  },
  {
    subject: "mathematics",
    matches: {
      keywords: [
        "algebra",
        "calculus",
        "derivative",
        "equation",
        "integral",
        "matrix",
        "probability",
        "statistic",
        "theorem",
        "vector",
      ],
      phrases: [
        "chain rule",
        "linear algebra",
        "normal distribution",
        "proof by",
      ],
    },
  },
  {
    subject: "physics",
    matches: {
      keywords: [
        "acceleration",
        "energy",
        "force",
        "mass",
        "momentum",
        "motion",
        "quantum",
        "relativity",
        "thermodynamics",
        "velocity",
      ],
      phrases: ["newton", "kinetic energy", "potential energy", "free body"],
    },
  },
  {
    subject: "chemistry",
    matches: {
      keywords: [
        "acid",
        "base",
        "bond",
        "chemical",
        "chemistry",
        "equilibrium",
        "molecule",
        "molar",
        "mol",
        "ph",
        "reaction",
      ],
      phrases: [
        "activation energy",
        "periodic table",
        "redox",
        "stoichiometry",
      ],
    },
  },
  {
    subject: "biology",
    matches: {
      keywords: [
        "anatomy",
        "biology",
        "cell",
        "dna",
        "enzyme",
        "gene",
        "immune",
        "protein",
        "species",
        "tissue",
      ],
      phrases: [
        "cell membrane",
        "natural selection",
        "protein synthesis",
        "evolution",
      ],
    },
  },
  {
    subject: "medicine",
    matches: {
      keywords: [
        "anemia",
        "diagnosis",
        "dose",
        "histology",
        "inflammation",
        "insulin",
        "metabolism",
        "pathology",
        "pharmacology",
        "symptom",
      ],
      phrases: ["clinical trial", "patient care", "side effect", "vital signs"],
    },
  },
  {
    subject: "economics",
    matches: {
      keywords: [
        "economics",
        "elasticity",
        "gdp",
        "inflation",
        "interest",
        "market",
        "microeconomics",
        "macroeconomics",
        "recession",
        "supply",
        "demand",
      ],
      phrases: [
        "opportunity cost",
        "supply and demand",
        "utility maximization",
      ],
    },
  },
  {
    subject: "history",
    matches: {
      keywords: [
        "battle",
        "century",
        "colonial",
        "empire",
        "history",
        "independence",
        "revolution",
        "treaty",
        "war",
      ],
      phrases: ["world war", "cold war", "industrial revolution"],
    },
  },
  {
    subject: "law",
    matches: {
      keywords: [
        "appeal",
        "case",
        "contract",
        "court",
        "evidence",
        "jurisdiction",
        "liability",
        "statute",
        "tort",
      ],
      phrases: ["burden of proof", "civil procedure", "constitutional law"],
    },
  },
  {
    subject: "literature",
    matches: {
      keywords: [
        "character",
        "drama",
        "essay",
        "genre",
        "metaphor",
        "narrative",
        "novel",
        "poem",
        "poetry",
        "rhetoric",
      ],
      phrases: ["close reading", "literary analysis", "point of view"],
    },
  },
  {
    subject: "philosophy",
    matches: {
      keywords: [
        "ethics",
        "logic",
        "metaphysics",
        "ontology",
        "phenomenology",
        "philosophy",
        "reasoning",
        "skepticism",
        "virtue",
      ],
      phrases: ["moral dilemma", "truth conditions", "valid argument"],
    },
  },
  {
    subject: "finance",
    matches: {
      keywords: [
        "asset",
        "bond",
        "cashflow",
        "equity",
        "investment",
        "portfolio",
        "risk",
        "valuation",
        "yield",
      ],
      phrases: ["discount rate", "net present value", "return on investment"],
    },
  },
  {
    subject: "geography",
    matches: {
      keywords: [
        "continent",
        "country",
        "desert",
        "earthquake",
        "geography",
        "mountain",
        "ocean",
        "population",
        "river",
        "terrain",
      ],
      phrases: ["climate zone", "latitude and longitude", "plate tectonics"],
    },
  },
];

const WORD_PATTERN = /[^a-z0-9]+/g;

function normalizeText(value: string) {
  return value.toLowerCase().replace(WORD_PATTERN, " ").trim();
}

function countMatches(value: string, match: SubjectMatch) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 0;
  }

  let score = 0;
  for (const keyword of match.keywords) {
    const pattern = new RegExp(
      `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "g"
    );
    const hits = normalized.match(pattern)?.length ?? 0;
    score += hits;
  }

  for (const phrase of match.phrases ?? []) {
    if (normalized.includes(phrase)) {
      score += 2;
    }
  }

  return score;
}

export interface SubjectDetectionResult {
  confidence: number;
  source: "heuristic" | "llm" | "none";
  subject: string | null;
}

export function detectSubjectFromText(input: string): SubjectDetectionResult {
  const normalized = normalizeText(input);
  if (!normalized) {
    return { confidence: 0, source: "none", subject: null };
  }

  let bestSubject: string | null = null;
  let bestScore = 0;
  let secondBestScore = 0;

  for (const candidate of SUBJECT_MATCHERS) {
    const score = countMatches(normalized, candidate.matches);
    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      bestSubject = candidate.subject;
      continue;
    }

    if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  if (!bestSubject || bestScore <= 0) {
    return { confidence: 0, source: "none", subject: null };
  }

  const separation = Math.max(0, bestScore - secondBestScore);
  const confidence = Math.max(
    0.1,
    Math.min(0.98, 0.35 + bestScore * 0.12 + separation * 0.08)
  );

  return {
    confidence,
    source: "heuristic",
    subject: bestSubject,
  };
}
