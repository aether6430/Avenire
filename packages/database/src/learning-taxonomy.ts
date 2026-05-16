export interface LearningTaxonomy {
  concept: string;
  subject: string;
  topic: string;
}

const SUBJECT_LABEL_ALIASES: Record<string, string> = {
  biology: "Biology",
  chemistry: "Chemistry",
  "computer science": "Computer Science",
  computer_science: "Computer Science",
  cs: "Computer Science",
  economics: "Economics",
  electronics: "Electronics",
  finance: "Finance",
  general: "General",
  "general studies": "General",
  geography: "Geography",
  history: "History",
  law: "Law",
  literature: "Literature",
  math: "Mathematics",
  mathematics: "Mathematics",
  maths: "Mathematics",
  medicine: "Medicine",
  philosophy: "Philosophy",
  physics: "Physics",
  psychology: "Psychology",
};

const SUBJECT_INFERENCE_RULES: Array<{
  keywords: string[];
  subject: string;
}> = [
  {
    keywords: [
      "amino acid",
      "amino acids",
      "protein",
      "proteins",
      "biomolecule",
      "biomolecules",
      "cell",
      "cells",
      "genetic",
      "dna",
      "rna",
    ],
    subject: "Biology",
  },
  {
    keywords: [
      "thermochemistry",
      "gibbs",
      "enthalpy",
      "entropy",
      "electrochemistry",
      "molecule",
      "molecules",
      "molar",
      "reaction",
      "reactions",
      "stoichiometry",
      "equilibrium",
      "acid",
      "base",
      "ph",
    ],
    subject: "Chemistry",
  },
  {
    keywords: [
      "electrostatics",
      "electric field",
      "potential energy",
      "ring charge",
      "kinematics",
      "mechanics",
      "relativity",
      "twin paradox",
      "pendulum",
    ],
    subject: "Physics",
  },
  {
    keywords: [
      "transformer",
      "attention",
      "algorithm",
      "algorithms",
      "database",
      "network",
      "programming",
      "https",
      "tls",
      "file system",
      "workspace",
    ],
    subject: "Computer Science",
  },
  {
    keywords: [
      "probability",
      "statistics",
      "combinatorics",
      "pigeonhole",
      "ramsey",
      "permutation",
      "combination",
      "calculus",
      "algebra",
      "geometry",
    ],
    subject: "Mathematics",
  },
  {
    keywords: ["revolution", "empire", "bastille", "robespierre", "napoleon"],
    subject: "History",
  },
  {
    keywords: ["market", "inflation", "supply", "demand", "gdp"],
    subject: "Economics",
  },
  {
    keywords: [
      "phone",
      "smartphone",
      "laptop",
      "battery",
      "display",
      "charging",
      "camera",
      "pixel 9a",
    ],
    subject: "Electronics",
  },
];

const SUBJECT_TOPIC_NORMALIZERS: Record<
  string,
  Array<{ keywords: string[]; topic: string }>
> = {
  Biology: [
    {
      keywords: ["amino acid", "amino acids", "biomolecule", "biomolecules"],
      topic: "Biomolecules",
    },
    {
      keywords: ["protein", "proteins"],
      topic: "Proteins",
    },
  ],
  Chemistry: [
    {
      keywords: ["thermochemistry", "gibbs", "enthalpy", "entropy"],
      topic: "Thermochemistry",
    },
    {
      keywords: ["acid", "base", "ph", "buffer"],
      topic: "Acids and Bases",
    },
    {
      keywords: ["equilibrium", "le chatelier"],
      topic: "Chemical Equilibrium",
    },
  ],
  "Computer Science": [
    {
      keywords: ["transformer", "attention", "llm", "language model"],
      topic: "Machine Learning",
    },
    {
      keywords: ["https", "tls", "ssl"],
      topic: "Networking",
    },
    {
      keywords: ["file system", "workspace", "path"],
      topic: "File Systems",
    },
  ],
  Mathematics: [
    {
      keywords: ["pigeonhole", "ramsey", "combinatorics"],
      topic: "Combinatorics",
    },
    {
      keywords: ["probability", "statistics"],
      topic: "Probability and Statistics",
    },
  ],
  Physics: [
    {
      keywords: [
        "electric field",
        "electrostatics",
        "potential energy",
        "charge",
      ],
      topic: "Electrostatics",
    },
    {
      keywords: ["twin paradox", "relativity", "lorentz"],
      topic: "Relativity",
    },
    {
      keywords: ["pendulum", "oscillator", "damped", "oscillation"],
      topic: "Oscillations",
    },
  ],
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function toSearchText(value: string) {
  return normalizeWhitespace(value.toLowerCase().replace(/[_-]+/g, " "));
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function sanitizeLabel(
  value: unknown,
  maxLength: number,
  transform?: (value: string) => string
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return null;
  }

  const nextValue = transform ? transform(normalized) : normalized;
  return nextValue.slice(0, maxLength);
}

function inferSubjectFromText(text: string | null | undefined) {
  if (typeof text !== "string") {
    return null;
  }

  const haystack = toSearchText(text);
  if (!haystack) {
    return null;
  }

  let bestMatch: { score: number; subject: string } | null = null;

  for (const rule of SUBJECT_INFERENCE_RULES) {
    const score = rule.keywords.reduce(
      (total, keyword) => total + (haystack.includes(keyword) ? 1 : 0),
      0
    );
    if (score <= 0) {
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        score,
        subject: rule.subject,
      };
    }
  }

  return bestMatch?.subject ?? null;
}

function normalizeTopicForSubject(
  value: string | null,
  subject: string | null,
  text: string | null,
  preferRuleOverride: boolean
) {
  const normalizedValue = value ? normalizeWhitespace(value) : null;
  const normalizedSubject = subject ?? null;
  const haystack = [normalizedValue, text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (normalizedSubject && (preferRuleOverride || !normalizedValue)) {
    const rules = SUBJECT_TOPIC_NORMALIZERS[normalizedSubject] ?? [];
    const matchedTopic = rules.find((rule) =>
      rule.keywords.some((keyword) => haystack.includes(keyword))
    )?.topic;
    if (matchedTopic) {
      return matchedTopic;
    }
  }

  if (!normalizedValue) {
    return null;
  }

  return titleCase(normalizedValue.toLowerCase()).slice(0, 120);
}

function normalizeConceptForSubject(
  value: string | null,
  subject: string | null,
  topic: string | null,
  text: string | null,
  preferRuleOverride: boolean
) {
  const normalizedValue = value ? normalizeWhitespace(value) : null;
  const haystack = [normalizedValue, topic, text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (preferRuleOverride && subject === "Biology") {
    if (haystack.includes("essential amino")) {
      return "Essential amino acids";
    }

    if (
      haystack.includes("amino acid") ||
      haystack.includes("amino acids") ||
      haystack.includes("biomolecule")
    ) {
      return "Amino acids and biomolecules";
    }
  }

  if (
    preferRuleOverride &&
    subject === "Chemistry" &&
    (haystack.includes("thermochemistry") ||
      haystack.includes("gibbs") ||
      haystack.includes("enthalpy") ||
      haystack.includes("entropy"))
  ) {
    return "Thermochemistry";
  }

  if (!normalizedValue) {
    return topic;
  }

  return normalizedValue.slice(0, 180);
}

export function canonicalizeSubjectLabel(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = toSearchText(value);
  if (!normalized) {
    return null;
  }

  return SUBJECT_LABEL_ALIASES[normalized] ?? titleCase(normalized);
}

export function canonicalizeLearningTaxonomy(input: {
  concept?: string | null | undefined;
  subject?: string | null | undefined;
  text?: string | null | undefined;
  topic?: string | null | undefined;
}): LearningTaxonomy | null {
  const rawSubject = canonicalizeSubjectLabel(input.subject ?? null);
  const normalizedText = sanitizeLabel(input.text ?? null, 1000);
  const inferredSubject = inferSubjectFromText(
    [input.subject, input.topic, input.concept, normalizedText]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
  );

  const subject =
    inferredSubject &&
    (rawSubject === null ||
      rawSubject === "General" ||
      (rawSubject === "Physics" &&
        (inferredSubject === "Biology" || inferredSubject === "Chemistry")))
      ? inferredSubject
      : rawSubject;
  const subjectWasOverridden = Boolean(subject && rawSubject !== subject);

  const topicInput = sanitizeLabel(input.topic ?? null, 120);
  const topic = normalizeTopicForSubject(
    topicInput,
    subject,
    normalizedText ?? null,
    subjectWasOverridden
  );

  const conceptInput = sanitizeLabel(input.concept ?? null, 180);
  const concept = normalizeConceptForSubject(
    conceptInput,
    subject,
    topic,
    normalizedText ?? null,
    subjectWasOverridden
  );

  if (!(subject && topic && concept)) {
    return null;
  }

  return {
    concept,
    subject,
    topic,
  };
}
