import {
  normalizeFrontmatterProperties,
  normalizePageMetadataState,
  type PageMetadataState,
} from "@/lib/frontmatter";

export interface NoteRoutePatchBody {
  content?: string;
  page?: {
    bannerUrl?: string | null;
    icon?: string | null;
    properties?: Record<string, unknown>;
  };
}

export interface ResolvedNoteRoutePatchUpdate {
  hasContent: boolean;
  hasPage: boolean;
  isValid: boolean;
  nextContent?: string;
  nextPage: PageMetadataState | null;
  trimmedContent: string;
}

export function resolveNoteRoutePatchUpdate(input: {
  body: NoteRoutePatchBody;
  existingPage: PageMetadataState | null | undefined;
}): ResolvedNoteRoutePatchUpdate {
  const hasContent = typeof input.body.content === "string";
  const hasPage = input.body.page !== undefined;

  if (!(hasContent || hasPage)) {
    return {
      hasContent,
      hasPage,
      isValid: false,
      nextPage: input.existingPage ?? null,
      trimmedContent: "",
    };
  }

  const nextContent = hasContent ? (input.body.content ?? "") : undefined;
  const trimmedContent = nextContent?.trim() ?? "";
  const nextPage = hasPage
    ? normalizePageMetadataState({
        ...input.existingPage,
        ...input.body.page,
        properties:
          input.body.page?.properties === undefined
            ? (input.existingPage?.properties ?? {})
            : normalizeFrontmatterProperties(input.body.page.properties),
      })
    : (input.existingPage ?? null);

  return {
    hasContent,
    hasPage,
    isValid: true,
    nextContent,
    nextPage,
    trimmedContent,
  };
}
