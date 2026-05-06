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
            <div className="pointer-events-none absolute inset-0 h-full w-full bg-[repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:12px_12px] opacity-50 mask-radial-from-10%"></div>
            <div className="flex items-center gap-2">
              <NativeIcon />
              <CardTitle>Native learning tools</CardTitle>
            </div>
            <CardDescription>
              Search files, write markdown notes, graph relationships, and
              review cards without moving your study context between apps.
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
              Ask across uploaded papers, notes, folders, and generated assets
              so answers start from the material you are studying.
            </CardDescription>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <RealtimeSyncIcon />
              <CardTitle>Realtime note updates</CardTitle>
            </div>
            <CardDescription>
              AI edits and generated notes appear in the editor as they land,
              including split screen workflows.
            </CardDescription>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <SDKIcon />
              <CardTitle>Spaced repetition loop</CardTitle>
            </div>
            <CardDescription>
              Convert hard explanations and misconceptions into cards that
              come back when you actually need to review them.
            </CardDescription>
          </Card>
        </div>
      </div>
    </Container>
  );
};
