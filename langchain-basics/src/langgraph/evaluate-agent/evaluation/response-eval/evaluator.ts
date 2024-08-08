import { pull } from "langchain/hub";
import { Example, Run } from "langsmith";
import { EvaluationResult } from "langsmith/evaluation";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputToolsParser } from "langchain/output_parsers";

type PromptTemplateInput = {
  question: string;
  correct_answer: string;
  model_generated_answer: string;
};

const graderTool = tool((args) => JSON.stringify(args), {
  name: "grader",
  description:
    "Score the model-generated answer for whether it matches the ground truth (correct) answer. Give a score between 0 and 1.",
  schema: z.object({
    score: z
      .number()
      .min(0)
      .max(1)
      .describe(
        "The score of the model-generated answer compared to the correct answer"
      ),
    explanation: z.string().describe("The explanation of the score"),
  }),
});

export async function answerVsReferenceEvaluator(
  run: Run,
  example?: Example
): Promise<EvaluationResult> {
  const prompt = await pull<ChatPromptTemplate<PromptTemplateInput>>(
    "bianbianzhu/rag-answer-vs-reference-1"
  );

  const chatModel = new ChatOpenAI({
    temperature: 0,
    modelName: "gpt-4o-mini",
  });

  const modelWithTools = chatModel.bindTools([graderTool], {
    runName: "gradeAnswerVsReference",
    tool_choice: {
      type: "function",
      function: {
        name: graderTool.name,
      },
    },
  });

  const parser = new JsonOutputToolsParser();

  const chain = prompt.pipe(modelWithTools).pipe(parser);

  const res = await chain.invoke({
    question: example?.inputs?.input ?? "",
    model_generated_answer: run.outputs?.output ?? "",
    correct_answer: example?.outputs?.output ?? "",
  });

  const { score, explanation } = res[0].args;

  return {
    key: "answer_vs_reference",
    score,
    comment: explanation,
  };
}
