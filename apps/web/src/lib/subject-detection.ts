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
