import { apollo, generateText } from "@avenire/ai";
import { Schema } from "effect-v4";
import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { getSessionUser } from "@/lib/workspace";

const aiEditSchema = Schema.Struct({
  action: Schema.Literals([
    "elaborate",
    "explain",
    "improve",
    "proofread",
    "simplify",
    "summarize",
  ]),
  text: Schema.String.check(Schema.isLengthBetween(1, 40_000)),
});

const markdownWriterRules = [
  "You are writing directly into a markdown note editor.",
  "Return valid Markdown only, with no surrounding commentary, labels, or code fences unless a code fence is part of the content.",
  "Preserve useful existing markdown structure such as headings, lists, links, bold, italic, code, tables, and task lists.",
  "When math is needed, write LaTeX inline as $...$ and display math as $$...$$. Never use \\(...\\) or \\[...\\].",
  "Do not escape markdown syntax unnecessarily.",
].join(" ");

const prompts: Record<(typeof aiEditSchema.Type)["action"], string> = {
  elaborate: `${markdownWriterRules} Expand the selected text with useful detail while preserving the user's voice.`,
  explain: `${markdownWriterRules} Explain the selected text clearly and directly.`,
  improve: `${markdownWriterRules} Improve the selected writing for clarity, flow, and precision while preserving meaning.`,
  proofread: `${markdownWriterRules} Proofread the selected text. Fix grammar, spelling, and punctuation without changing meaning.`,
  simplify: `${markdownWriterRules} Rewrite the selected text in simpler, clearer language while preserving meaning.`,
  summarize:
    "Summarize the current page in one concise sentence suitable for a note property. Return only the summary.",
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonRequest(request, aiEditSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { action, text } = parsed.data;
  const result = await generateText({
    model: apollo.languageModel("apollo-meta"),
    system: prompts[action],
    prompt: text,
    temperature: 0.2,
    maxOutputTokens: action === "summarize" ? 120 : 900,
  });

  return NextResponse.json({ text: result.text.trim() });
}
