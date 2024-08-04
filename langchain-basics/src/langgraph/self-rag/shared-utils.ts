import { z } from "zod";

export const graderToolParamSchema = z.object({
  score: z.number().int().min(0).max(1).describe("Relevance score 1 or 0"),
  explanation: z.string().describe("Explanation of the score"),
});

export type GraderToolParamSchema = z.infer<typeof graderToolParamSchema>;

export const booleanGraderToolParamSchema = z.object({
  grade: z
    .boolean()
    .describe(
      "Whether the generation from the model is supported by the facts"
    ),
  explanation: z.string().describe("Explanation of the grade"),
});

export type BooleanGraderToolParamSchema = z.infer<
  typeof booleanGraderToolParamSchema
>;

export const generationUsefulToolParamSchema = z.object({
  grade: z.boolean().describe("Whether the question answers the user's query"),
  explanation: z.string().describe("Explanation of the grade"),
});

export type GenerationUsefulToolParam = z.infer<
  typeof generationUsefulToolParamSchema
>;
