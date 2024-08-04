import { GraphState } from "../graph-state";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputToolsParser } from "langchain/output_parsers";
import { tool } from "@langchain/core/tools";
import {
  GenerationUsefulToolParam,
  generationUsefulToolParamSchema,
} from "../shared-utils";
import { pull } from "langchain/hub";
import { AIMessage } from "@langchain/core/messages";

type PromptTemplateInput = {
  question: string;
  generation: string;
};

const graderTool = tool(
  async (args: GenerationUsefulToolParam) => JSON.stringify(args),
  {
    name: "grader",
    description:
      "Grade the generation for whether it is useful to answer the user's question. Give a boolean grade true or false, where true means that the generation is useful.",
    schema: generationUsefulToolParamSchema,
  }
);

async function gradeGenerationUseful(
  state: GraphState
): Promise<Pick<GraphState, "generationUseful">> {
  console.log("<---- GRADE GENERATION USEFUL ---->");
  const { generations = [], questions } = state;

  const currentQuestion = questions.at(-1) ?? "";
  const currentGeneration = generations.at(-1) ?? new AIMessage("");

  const chatModel = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  });

  const modelWithTools = chatModel.bindTools([graderTool], {
    tool_choice: {
      type: "function",
      function: {
        name: graderTool.name,
      },
    },
  });

  const parser = new JsonOutputToolsParser();

  /**
   * @param question - string
   * @param generation - AIMessage -> string
   */
  const prompt = await pull<ChatPromptTemplate<PromptTemplateInput>>(
    "bianbianzhu/rag-generation-useful"
  );

  const chain = prompt.pipe(modelWithTools).pipe(parser);

  const res = await chain.invoke({
    question: currentQuestion,
    generation: currentGeneration.content as string,
  });

  return {
    generationUseful: res[0].args as GenerationUsefulToolParam,
  };
}

export default gradeGenerationUseful;
