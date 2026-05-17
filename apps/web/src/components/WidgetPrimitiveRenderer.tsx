"use client";

import type { WidgetSpec } from "@avenire/ai/tools";
import { WidgetPrimitiveRenderContent } from "@/components/widget-primitive-render-content";

interface PrimitiveRendererProps {
  spec: WidgetSpec;
}

export function WidgetPrimitiveRenderer({ spec }: PrimitiveRendererProps) {
  return <WidgetPrimitiveRenderContent spec={spec} />;
}
