import type React from "react";
import {
  BrainIcon,
  FingerprintIcon,
  MouseBoxIcon,
  NativeIcon,
  RealtimeSyncIcon,
  SDKIcon,
} from "@/components/marketing/icons/bento-icons";
import { Badge } from "../badge";
import { Container } from "../container";
import { SectionHeading } from "../section-heading";
import { SubHeading } from "../subheading";
import { Card, CardDescription, CardTitle } from "./card";
import { TextToWorkflowBuilderSkeleton } from "./skeletons";
import {
  LLMModelSelectorSkeleton,
  NativeToolsIntegrationSkeleton,
} from "./static-skeletons";

interface Tab {
  description: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  id: string;
  title: string;
}

export const AgenticIntelligence = () => {
  return (
    <Container className="border-divide border-x">
      <div className="flex flex-col items-center py-16">
        <Badge text="Features" />
        <SectionHeading className="mt-4">
          Built for reasoning workflows
        </SectionHeading>

        <SubHeading as="p" className="mx-auto mt-6 max-w-lg px-2">
          Move between source material, interactive explanations, searchable
          files, and review without losing the thread of what you were trying to
          understand.
        </SubHeading>
        <div className="mt-16 grid grid-cols-1 divide-y divide-divide border-divide border-y md:grid-cols-2 md:divide-x">
          <Card className="mask-b-from-80% overflow-hidden">
            <div className="flex items-center gap-2">
              <BrainIcon />
              <CardTitle>Interactive AI sessions</CardTitle>
            </div>
            <CardDescription>
              Turn a PDF, note, or question into guided explanations, checks,
              widgets, and follow-ups that adapt to the topic.
            </CardDescription>
            <LLMModelSelectorSkeleton />
          </Card>
          <Card className="mask-b-from-80% overflow-hidden">
            <div className="flex items-center gap-2">
              <MouseBoxIcon />
              <CardTitle>Misconception logging</CardTitle>
            </div>
            <CardDescription>
              Capture what went wrong during a session, then turn that gap into
              targeted mindset cards and future review.
            </CardDescription>
            <TextToWorkflowBuilderSkeleton />
          </Card>
        </div>
        <div className="w-full">
          <Card className="relative w-full max-w-none overflow-hidden bg-neutral-900/60">
            <div className="mask-radial-from-10% pointer-events-none absolute inset-0 h-full w-full bg-[repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:12px_12px] opacity-50" />
            <div className="flex items-center gap-2">
              <NativeIcon />
              <CardTitle>Native learning tools</CardTitle>
            </div>
            <CardDescription>
              Keep source files, editable notes, concept graphs, AI help, and
              review cards in one connected study surface.
            </CardDescription>
            <NativeToolsIntegrationSkeleton />
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <Card>
            <div className="flex items-center gap-2">
              <FingerprintIcon />
              <CardTitle>File-aware answers</CardTitle>
            </div>
            <CardDescription>
              Ground explanations in the PDFs, folders, notes, and generated
              artifacts already inside your workspace.
            </CardDescription>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <RealtimeSyncIcon />
              <CardTitle>Realtime note updates</CardTitle>
            </div>
            <CardDescription>
              Save useful answers as markdown and see AI edits land in open
              editor panes without refreshing.
            </CardDescription>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <SDKIcon />
              <CardTitle>Spaced repetition loop</CardTitle>
            </div>
            <CardDescription>
              Turn missed ideas into mindset cards and review prompts tied back
              to the exact note or source.
            </CardDescription>
          </Card>
        </div>
      </div>
    </Container>
  );
};
