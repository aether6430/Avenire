"use client";

import { useMemo, useState } from "react";
import {
  type CompletedToolPart,
  getToolLabel,
  TOOL_LABELS,
  type ToolPart,
} from "@/components/chat/tool-part-model";
import {
  ToolError,
  ToolPending,
  ToolPendingCard,
  ToolRow,
} from "@/components/chat/tool-part-shared";
import { MindsetCardStack } from "@/components/flashcards/mindset-card-stack";
import { cn } from "@/lib/utils";

function buildOccurrenceKeys<T>(
  items: readonly T[],
  toBaseKey: (item: T) => string
) {
  const seenKeys = new Map<string, number>();
  return items.map((item) => {
    const baseKey = toBaseKey(item);
    const occurrence = seenKeys.get(baseKey) ?? 0;
    seenKeys.set(baseKey, occurrence + 1);
    return occurrence === 0 ? baseKey : `${baseKey}-${occurrence}`;
  });
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <p className="whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function MindsetSetPreview({
  cards,
  setId,
  title,
}: {
  cards: Array<{
    backMarkdown: string;
    frontMarkdown: string;
  }>;
  setId: string;
  title: string;
}) {
  const previewCards = useMemo(
    () =>
      cards.map((card, index) => ({
        back: <MarkdownContent content={card.backMarkdown} />,
        front: <MarkdownContent content={card.frontMarkdown} />,
        id: `${setId}:${index}:${card.frontMarkdown.slice(
          0,
          24
        )}:${card.backMarkdown.slice(0, 24)}`,
        title,
      })),
    [cards, setId, title]
  );

  if (cards.length === 0) {
    return (
      <p className="font-mono text-[11px] text-foreground/28">
        No cards generated
      </p>
    );
  }

  return (
    <div className="mb-2">
      <MindsetCardStack
        autoAdvanceMs={3800}
        cards={previewCards}
        className="max-w-[28rem]"
        showCounter
        showStackLabel
        stackLabel={title}
      />
    </div>
  );
}

function QuizToolOutput({
  questions,
  setId,
  title,
}: {
  questions: Array<{
    backMarkdown: string;
    correctOptionIndex: number;
    explanation?: string | null;
    frontMarkdown: string;
    options: string[];
  }>;
  setId: string;
  title: string;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const questionKeys = useMemo(
    () =>
      buildOccurrenceKeys(
        questions,
        (question) =>
          `${setId}:${question.frontMarkdown}:${question.backMarkdown}:${question.correctOptionIndex}:${question.options.join("\u0001")}`
      ),
    [questions, setId]
  );

  return (
    <div className="mb-2 space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-foreground/72 text-sm">
          {title}
        </span>
        <span className="font-mono text-[11px] text-foreground/28">
          {questions.length} questions
        </span>
        <a
          className="font-mono text-[11px] text-foreground/40 underline underline-offset-2 hover:text-foreground/60"
          href={`/workspace/flashcards/${setId}`}
        >
          open mindset set
        </a>
      </div>
      <div className="space-y-3">
        {questions.map((question, index) => {
          const selected = answers[index];
          const answered = typeof selected === "number";
          const optionKeys = buildOccurrenceKeys(
            question.options,
            (option) => `${questionKeys[index]}:${option}`
          );
          return (
            <div
              className="rounded-lg border border-border/40 p-3"
              key={questionKeys[index]}
            >
              <p className="mb-2 font-medium text-sm">
                {index + 1}. {question.frontMarkdown}
              </p>
              <div className="grid gap-1.5">
                {question.options.map((option, optionIndex) => {
                  const isCorrect = optionIndex === question.correctOptionIndex;
                  return (
                    <button
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors",
                        answered &&
                          isCorrect &&
                          "border-emerald-500/60 bg-emerald-500/10",
                        answered &&
                          selected === optionIndex &&
                          !isCorrect &&
                          "border-destructive/60 bg-destructive/10",
                        !answered && "border-border/40 hover:bg-muted/50"
                      )}
                      disabled={answered}
                      key={optionKeys[optionIndex]}
                      onClick={() =>
                        setAnswers((current) => ({
                          ...current,
                          [index]: optionIndex,
                        }))
                      }
                      type="button"
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {answered ? (
                <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs">
                  <p className="font-medium">
                    {selected === question.correctOptionIndex
                      ? "Correct"
                      : "Incorrect"}
                  </p>
                  <p className="mt-0.5 text-foreground/50">
                    {question.explanation ?? question.backMarkdown}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToolCompletedOutput({ part }: { part: CompletedToolPart }) {
  switch (part.type) {
    case "tool-note_agent":
      return (
        <div className="mb-2 space-y-1">
          <ToolRow label="Notes">
            <span className="font-mono text-[11px] text-foreground/28">
              {part.output.operation} {part.output.notes.length} note(s)
            </span>
          </ToolRow>
          {part.output.notes.slice(0, 3).map((note) => (
            <div
              className="ml-0 rounded-md border border-border/30 p-2"
              key={note.fileId}
            >
              <p className="font-mono text-[10px] text-foreground/40">
                {note.workspacePath}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap font-mono text-[11px] text-foreground/50">
                {note.contentPreview.slice(0, 200)}
              </p>
            </div>
          ))}
        </div>
      );
    case "tool-search_materials":
      return (
        <div className="mb-2 space-y-1">
          <ToolRow label="Search">
            <span className="font-mono text-[12px] text-foreground/62">
              {part.output.query}
            </span>
            <span className="font-mono text-[11px] text-foreground/28">
              {part.output.totalMatches} matches
            </span>
          </ToolRow>
          {part.output.matches.slice(0, 4).map((match) => (
            <div
              className="ml-0 rounded-md border border-border/30 p-2"
              key={match.chunkId}
            >
              <p className="font-mono text-[10px] text-foreground/40">
                {match.workspacePath}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap font-mono text-[11px] text-foreground/50">
                {match.snippet}
              </p>
            </div>
          ))}
        </div>
      );
    case "tool-web_search":
      return (
        <div className="mb-2 space-y-1">
          <ToolRow label="Web search">
            <span className="font-mono text-[12px] text-foreground/62">
              {part.output.query}
            </span>
            <span className="font-mono text-[11px] text-foreground/28">
              {part.output.totalResults} results
            </span>
          </ToolRow>
          {typeof part.output.answer === "string" &&
          part.output.answer.length > 0 ? (
            <div className="ml-0 rounded-md border border-border/30 p-2">
              <p className="whitespace-pre-wrap font-mono text-[11px] text-foreground/50">
                {part.output.answer}
              </p>
            </div>
          ) : null}
          {part.output.results.slice(0, 4).map((result) => (
            <div
              className="ml-0 rounded-md border border-border/30 p-2"
              key={result.url}
            >
              <p className="font-mono text-[10px] text-foreground/40">
                {result.title}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap font-mono text-[11px] text-foreground/50">
                {result.content}
              </p>
            </div>
          ))}
        </div>
      );
    case "tool-generate_flashcards":
      return (
        <MindsetSetPreview
          cards={part.output.cards ?? []}
          setId={part.output.setId}
          title={part.output.title}
        />
      );
    case "tool-get_due_cards":
      return (
        <div className="mb-2 space-y-1">
          <ToolRow label="Due cards">
            <span className="font-mono text-[11px] text-foreground/28">
              {part.output.totalDueCount} due today
            </span>
          </ToolRow>
          {part.output.dueCards.slice(0, 3).map((card) => (
            <div
              className="ml-0 rounded-md border border-border/30 p-2"
              key={card.cardId}
            >
              <p className="font-mono text-[11px] text-foreground/50">
                {card.setTitle}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-foreground/40">
                {card.frontMarkdown}
              </p>
            </div>
          ))}
        </div>
      );
    case "tool-show_widget":
      return null;
    case "tool-quiz_me":
      return (
        <QuizToolOutput
          questions={part.output.questions}
          setId={part.output.setId}
          title={part.output.title}
        />
      );
    case "tool-load_skill":
      return (
        <ToolRow label="Loaded skill">
          <span className="font-mono text-[11px] text-foreground/28">
            loaded
          </span>
        </ToolRow>
      );
    case "tool-visualize_read_me":
      return (
        <ToolRow label="Loaded visual guide">
          <span className="font-mono text-[11px] text-foreground/28">
            loaded
          </span>
        </ToolRow>
      );
    default:
      return null;
  }
}

export function ChatToolPartSurface({ part }: { part: ToolPart }) {
  if (part.state === "input-streaming" || part.state === "input-available") {
    if (part.type === "tool-note_agent") {
      return (
        <ToolPendingCard
          description="Creating or updating workspace notes."
          label="writing"
          title={part.input?.task ?? "Workspace notes"}
        />
      );
    }

    if (part.type === "tool-generate_flashcards") {
      return (
        <ToolPendingCard
          description="Generating a mindset set from the current context."
          label="creating"
          title={part.input?.title ?? "Mindset Set"}
        />
      );
    }

    return <ToolPending label={getToolLabel(part.type)} />;
  }

  if (part.state === "output-error") {
    if (!TOOL_LABELS[part.type]) {
      return null;
    }
    return (
      <ToolError errorText={part.errorText} label={getToolLabel(part.type)} />
    );
  }

  if (part.state !== "output-available") {
    if (!TOOL_LABELS[part.type]) {
      return null;
    }
    return (
      <ToolRow label={getToolLabel(part.type)}>
        <span className="font-mono text-[11px] text-foreground/28">
          awaiting output
        </span>
      </ToolRow>
    );
  }

  return <ToolCompletedOutput part={part} />;
}
