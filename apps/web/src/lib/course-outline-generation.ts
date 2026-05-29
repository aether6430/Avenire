export type CourseOutlineSourceKind = "web" | "workspace" | "manual";

export interface CourseOutlineSource {
  content: string;
  label: string;
  kind: CourseOutlineSourceKind;
  score?: number;
  url?: string;
}

export interface CourseOutlineRequest {
  exam?: string | null;
  explicitSubtopics?: string[];
  sources?: CourseOutlineSource[];
  topic: string;
}

export interface GeneratedCourseOutlineNode {
  estimatedEffortMinutes: number;
  examWeight: number;
  focusRecommended: boolean;
  groundingState: "ai_suggested" | "user_added";
  id: string;
  nodeType: "module" | "topic" | "subtopic";
  parentId: string | null;
  riskPrompts: string[];
  sortOrder: number;
  sourceRefs: Array<{
    label?: string;
    type: "manual" | "url" | "file" | "note";
    url?: string;
  }>;
  title: string;
  userPriority: number;
  verificationState: "ai_suggested" | "needs_review" | "user_added";
}

type GeneratedCourseOutlineSourceRef =
  GeneratedCourseOutlineNode["sourceRefs"][number];

export interface GeneratedCourseOutline {
  nodes: GeneratedCourseOutlineNode[];
  sourceRefs: GeneratedCourseOutlineNode["sourceRefs"];
  summary: {
    focusCount: number;
    groundedCount: number;
    sourceCount: number;
  };
  title: string;
}

const MAX_OUTLINE_NODES = 18;
const MIN_SOURCE_TITLE_LENGTH = 5;
const TOPIC_SPLIT_PATTERN = /[,;]|\n|\r|(?:\s+-\s+)/g;
const GENERIC_SOURCE_WORDS = new Set([
  "guide",
  "notes",
  "overview",
  "revision",
  "syllabus",
  "topic",
  "topics",
]);

function normalizeTitle(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\d\s).:-]+/, "")
    .replace(/\s+\|.+$/, "")
    .trim();
}

function titleKey(value: string) {
  return normalizeTitle(value).toLowerCase();
}

function makeNodeId(index: number) {
  return `outline-${index + 1}`;
}

export function parseCourseSubtopics(value: string) {
  return value
    .split(TOPIC_SPLIT_PATTERN)
    .map(normalizeTitle)
    .filter((topic) => topic.length >= MIN_SOURCE_TITLE_LENGTH);
}

function sourceTitleCandidates(sources: CourseOutlineSource[]) {
  const candidates: string[] = [];
  for (const source of sources) {
    const title = normalizeTitle(source.label);
    if (title.length >= MIN_SOURCE_TITLE_LENGTH) {
      candidates.push(title);
    }

    const sentences = source.content
      .split(/[.!?]\s+/)
      .map(normalizeTitle)
      .filter((sentence) => sentence.length >= 18 && sentence.length <= 86);
    candidates.push(...sentences.slice(0, 2));
  }
  return candidates;
}

function uniqueCandidates(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const title = normalizeTitle(value);
    const key = titleKey(title);
    if (
      key.length < MIN_SOURCE_TITLE_LENGTH ||
      seen.has(key) ||
      GENERIC_SOURCE_WORDS.has(key)
    ) {
      continue;
    }
    seen.add(key);
    result.push(title);
  }
  return result;
}

function sourceRefsForTitle(
  title: string,
  sources: CourseOutlineSource[]
): GeneratedCourseOutlineNode["sourceRefs"] {
  const key = titleKey(title);
  const matches = sources.filter((source) => {
    const label = titleKey(source.label);
    const content = source.content.toLowerCase();
    return label.includes(key) || content.includes(key);
  });

  return matches.slice(0, 3).map((source): GeneratedCourseOutlineSourceRef => {
    if (source.kind === "web") {
      return { label: source.label, type: "url", url: source.url };
    }
    return {
      label: source.label,
      type: source.kind === "manual" ? "manual" : "file",
    };
  });
}

function importanceForIndex(index: number, count: number) {
  if (count <= 1) {
    return 3;
  }
  const score = 5 - Math.floor((index / Math.max(count - 1, 1)) * 3);
  return Math.max(2, Math.min(5, score));
}

function riskPromptsForTitle(title: string) {
  return [
    `Check whether the learner can explain ${title} without formula matching.`,
    `Look for confusion between definitions, assumptions, and exam method in ${title}.`,
  ];
}

export function buildCourseOutline(
  input: CourseOutlineRequest
): GeneratedCourseOutline {
  const sourceRefs = (input.sources ?? [])
    .slice(0, 8)
    .map((source): GeneratedCourseOutlineSourceRef => {
      if (source.kind === "web") {
        return { label: source.label, type: "url", url: source.url };
      }
      return {
        label: source.label,
        type: source.kind === "manual" ? "manual" : "file",
      };
    });
  const explicit = uniqueCandidates(input.explicitSubtopics ?? []);
  const sourced = uniqueCandidates(sourceTitleCandidates(input.sources ?? []));
  const topics = uniqueCandidates([
    ...explicit,
    ...sourced.filter(
      (candidate) => titleKey(candidate) !== titleKey(input.topic)
    ),
  ]).slice(0, MAX_OUTLINE_NODES);

  const examPrefix = input.exam?.trim() ? `${input.exam.trim()} ` : "";
  const title = normalizeTitle(`${examPrefix}${input.topic}`);
  const moduleId = makeNodeId(0);
  const nodes: GeneratedCourseOutlineNode[] = [
    {
      estimatedEffortMinutes: 45,
      examWeight: 1,
      focusRecommended: true,
      groundingState: explicit.length > 0 ? "user_added" : "ai_suggested",
      id: moduleId,
      nodeType: "module",
      parentId: null,
      riskPrompts: riskPromptsForTitle(title),
      sortOrder: 0,
      sourceRefs,
      title,
      userPriority: 5,
      verificationState: explicit.length > 0 ? "user_added" : "needs_review",
    },
  ];

  for (const [index, topic] of topics.entries()) {
    const priority = importanceForIndex(index, topics.length);
    const refs = sourceRefsForTitle(topic, input.sources ?? []);
    nodes.push({
      estimatedEffortMinutes: priority >= 4 ? 40 : 25,
      examWeight: priority >= 4 ? 0.8 : 0.45,
      focusRecommended: priority >= 4 || refs.length === 0,
      groundingState: explicit.some(
        (value) => titleKey(value) === titleKey(topic)
      )
        ? "user_added"
        : "ai_suggested",
      id: makeNodeId(index + 1),
      nodeType: index < 4 ? "topic" : "subtopic",
      parentId: moduleId,
      riskPrompts: riskPromptsForTitle(topic),
      sortOrder: index + 1,
      sourceRefs: refs,
      title: topic,
      userPriority: priority,
      verificationState: refs.length > 0 ? "ai_suggested" : "needs_review",
    });
  }

  return {
    nodes,
    sourceRefs,
    summary: {
      focusCount: nodes.filter((node) => node.focusRecommended).length,
      groundedCount: nodes.filter((node) => node.sourceRefs.length > 0).length,
      sourceCount: input.sources?.length ?? 0,
    },
    title,
  };
}
