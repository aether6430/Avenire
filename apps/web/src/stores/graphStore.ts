import { RefObject } from "react";
import { create } from "zustand";

type GraphStore = {
  graphRef: RefObject<Desmos.Calculator | null> | null;
  setGraphRef: (newGraph: RefObject<Desmos.Calculator | null>) => void;
  addExpression: (expression: Desmos.ExpressionState[]) => void,
  clearGraph: () => void
};

export const useGraphStore = create<GraphStore>((set, get) => ({
  graphRef: null,
  setGraphRef: (newGraph) => set({ graphRef: newGraph }),
  addExpression: (expression) => {
    const { graphRef } = get()
    if (graphRef && graphRef.current) {
      graphRef.current.setExpressions(expression); // Assuming setExpression is a method on the Desmos calculator
    }
  },
  clearGraph: () => {
    const { graphRef } = get()
    if (graphRef && graphRef.current) {
      graphRef.current.setBlank(); // Assuming setExpression is a method on the Desmos calculator
    }
  }

}));