"use client";

export interface NoteWidgetPayload {
  html: string;
  title?: string | null;
}

export const NOTE_WIDGET_INSERT_EVENT = "avenire:insert-note-widget";

function encodeUtf8Base64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeUtf8Base64(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function serializeNoteWidgetPayload(payload: NoteWidgetPayload) {
  const normalized = {
    html: payload.html,
    title: payload.title?.trim() || null,
  };

  return encodeUtf8Base64(JSON.stringify(normalized));
}

export function parseSerializedNoteWidgetPayload(serialized: string) {
  try {
    const decoded = decodeUtf8Base64(serialized.trim());
    const parsed = JSON.parse(decoded) as Partial<NoteWidgetPayload>;
    const html = typeof parsed.html === "string" ? parsed.html : "";
    if (!html.trim()) {
      return null;
    }

    return {
      html,
      title: typeof parsed.title === "string" ? parsed.title.trim() : null,
    } satisfies NoteWidgetPayload;
  } catch {
    return null;
  }
}

export function dispatchNoteWidgetInsertion(payload: NoteWidgetPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<NoteWidgetPayload>(NOTE_WIDGET_INSERT_EVENT, {
      detail: payload,
    })
  );
}
