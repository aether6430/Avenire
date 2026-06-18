"use client";
import React from "react";
import { Container } from "../container";
import { Badge } from "../badge";
import { SubHeading } from "../subheading";
import { SectionHeading } from "../seciton-heading";
import { Card, CardDescription, CardTitle } from "./card";
import {
  BrainIcon,
  FingerprintIcon,
  MouseBoxIcon,
  NativeIcon,
  RealtimeSyncIcon,
  SDKIcon,
} from "@/components/marketing/icons/bento-icons";
import {
  LLMModelSelectorSkeleton,
  NativeToolsIntegrationSkeleton,
  TextToWorkflowBuilderSkeleton,
} from "./skeletons";

type Tab = {
  title: string;
  description: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  id: string;
};

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
          files, and review without losing the thread of what you were trying
          to understand.
        </SubHeading>
        <div className="border-divide divide-divide mt-16 grid grid-cols-1 divide-y border-y md:grid-cols-2 md:divide-x">
          <Card className="overflow-hidden mask-b-from-80%">
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
          <Card className="overflow-hidden mask-b-from-80%">
            <div className="flex items-center gap-2">
              <MouseBoxIcon />
              <CardTitle>Misconception logging</CardTitle>
            </div>
            <CardDescription>
              Capture what went wrong during a session, then turn that gap into
              targeted flashcards and future review.
            </CardDescription>
            <TextToWorkflowBuilderSkeleton />
          </Card>
        </div>
        <div className="w-full">
          <Card className="relative w-full max-w-none overflow-hidden bg-neutral-900/60">
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
              Turn missed ideas into flashcards and review prompts tied back to
              the exact note or source.
            </CardDescription>
          </Card>
        </div>
      </div>
    </Container>
  );
};
