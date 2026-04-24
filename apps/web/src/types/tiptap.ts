declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    deleteMermaidDiagram: (options: { pos: number }) => ReturnType;
    insertNoteWidget: (options: {
      html: string;
      pos?: number;
      title?: string | null;
    }) => ReturnType;
    insertMermaidDiagram: (options: {
      code?: string;
      pos?: number;
    }) => ReturnType;
    updateMermaidDiagram: (options: {
      pos: number;
      code: string;
    }) => ReturnType;
  }
}

export {};
