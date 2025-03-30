import { tool } from "ai";
import { z } from "zod";

const graphSchema = z.object({
  expressions: z.array(
    z.object({
      id: z.string().describe("A unique identifier for each graph object."),
      latex: z.string().describe(
        `A LaTeX string representing the mathematical expression to be graphed. Follow LaTeX standards:

      1. Multi-character symbols must be preceded by a backslash (e.g., '\\sin(x)').

      Examples:
      - A circle of radius 2: '(x - h)^2 + (y - k)^2 = r^2'
      - A line: 'y = mx + c'.
      - If you want to draw a slider use \`a=1\` and set the sliderBounds.

      Supported functions include:
      - Arithmetic: +, -, *, /, ^ (use curly braces for multi-character exponents)
      - Constants: e, \\pi
      - Trigonometric: \\sin, \\cos, \\tan, \\sec, \\cosec, \\cot, \\arcsin, \\arccos, \\arctan, etc.
      - Logarithms: ln, log, \\log_a(b) for arbitrary bases
      - Square roots: \\sqrt{x}.

      Don't forget to use backslashes
      This field is REQUIRED
	      `
      ),
      lineStyle: z.enum(["solid", "dashed", "dotted"]).optional().describe("Sets the drawing style for line segments. Optional"),
      sliderBounds: z
        .object({
          min: z.number().describe("Minimum value of the slider."),
          max: z.number().describe("Maximum value of the slider."),
          value: z.number().optional().describe("Current value of the slider."),
        })
        .optional()
        .describe("Defines slider behavior for dynamic variables. Use sliders to manipulate variables in expressions."),
    })
  )
});

export const graphTool = tool({
  description: "A tool for visualizing mathematical functions, equations, or expressions in LaTeX format. Always use graphs whenever mathematical expressions are mentioned and can be drawn to further visualize the concepts. Call this tool a maximum of once per message with all the expressions. Don't call it more than once per message.",
  parameters: graphSchema,
  execute: async ({ expressions }) => {
    const exp = expressions.map(({ latex, sliderBounds }) => ({ latex, sliderBounds }))
    return { expressions: exp }
  }
});
