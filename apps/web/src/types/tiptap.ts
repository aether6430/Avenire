declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaidDiagram: {
      deleteMermaidDiagram: (options: { pos: number }) => ReturnType;
      insertMermaidDiagram: (options: {
        code?: string;
        pos?: number;
      }) => ReturnType;
      updateMermaidDiagram: (options: {
        pos: number;
        code: string;
      }) => ReturnType;
    };
    noteWidget: {
      insertNoteWidget: (options: {
        html: string;
        pos?: number;
        title?: string | null;
      }) => ReturnType;
    };
  }
}

export {};
