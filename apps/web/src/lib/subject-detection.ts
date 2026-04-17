const SUBJECT_LABEL_ALIASES: Record<string, string> = {
  biology: "Biology",
  chemistry: "Chemistry",
  "computer science": "Computer Science",
  computer_science: "Computer Science",
  cs: "Computer Science",
  economics: "Economics",
  finance: "Finance",
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
};

const TOPIC_KEYWORDS: Array<{
  keywords: string[];
  subject?: string;
  topic: string;
}> = [
  {
    keywords: ["algebra", "equation", "inequality", "linear"],
    subject: "Mathematics",
    topic: "Algebra",
  },
  {
    keywords: ["calculus", "derivative", "integral", "limit"],
    subject: "Mathematics",
    topic: "Calculus",
  },
  {
    keywords: ["probability", "statistics", "distribution", "variance"],
    subject: "Mathematics",
    topic: "Probability and Statistics",
  },
  {
    keywords: ["kinematics", "velocity", "acceleration", "projectile"],
    subject: "Physics",
    topic: "Kinematics",
  },
  {
    keywords: ["force", "newton", "friction", "momentum"],
    subject: "Physics",
    topic: "Mechanics",
  },
  {
    keywords: ["thermodynamics", "entropy", "enthalpy", "gibbs"],
    subject: "Physics",
    topic: "Thermodynamics",
  },
  {
    keywords: ["cell", "dna", "gene", "genetics"],
    subject: "Biology",
    topic: "Genetics",
  },
  {
    keywords: ["evolution", "natural selection", "speciation"],
    subject: "Biology",
    topic: "Evolution",
  },
  {
    keywords: ["reaction", "stoichiometry", "equilibrium", "mole"],
    subject: "Chemistry",
    topic: "Chemical Reactions",
  },
  {
    keywords: ["acid", "base", "ph", "buffer"],
    subject: "Chemistry",
    topic: "Acids and Bases",
  },
  {
    keywords: ["algorithm", "sorting", "graph", "tree", "complexity"],
    subject: "Computer Science",
    topic: "Algorithms and Data Structures",
  },
  {
    keywords: ["database", "sql", "index", "query", "schema"],
    subject: "Computer Science",
    topic: "Databases",
  },
  {
    keywords: ["network", "tcp", "udp", "ip", "routing"],
    subject: "Computer Science",
    topic: "Networking",
  },
  {
    keywords: ["war", "revolution", "empire", "treaty"],
    subject: "History",
    topic: "Modern History",
  },
  {
    keywords: ["market", "inflation", "supply", "demand", "gdp"],
    subject: "Economics",
    topic: "Macroeconomics",
  },
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeSubjectLabel(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(
    value.replace(/[_-]+/g, " ").toLowerCase()
  );
  if (!normalized) {
    return null;
  }

  return SUBJECT_LABEL_ALIASES[normalized] ?? titleCase(normalized);
}

export function inferTopicLabel(
  text: string | null | undefined,
  subject?: string | null
) {
  if (typeof text !== "string") {
    return null;
  }

  const normalizedText = normalizeWhitespace(
    text.replace(/[_-]+/g, " ").toLowerCase()
  );
  if (!normalizedText) {
    return null;
  }

  const normalizedSubject = normalizeSubjectLabel(subject)?.toLowerCase() ?? null;

  const match = TOPIC_KEYWORDS.find((entry) => {
    if (entry.subject && normalizedSubject && entry.subject.toLowerCase() !== normalizedSubject) {
      return false;
    }

    return entry.keywords.some((keyword) => normalizedText.includes(keyword));
  });

  return match?.topic ?? null;
}
