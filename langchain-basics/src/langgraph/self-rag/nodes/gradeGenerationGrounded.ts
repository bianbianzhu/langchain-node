import { AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputToolsParser } from "langchain/output_parsers";
import { GraphState } from "../graph-state";
import {
  booleanGraderToolParamSchema,
  BooleanGraderToolParamSchema,
} from "../shared-utils";
import { pull } from "langchain/hub";
import { formatDocumentsAsString } from "langchain/util/document";

type PromptTemplateInput = {
  documents: string; // Document[] -> string
  generation: string; // AIMessage -> string
};

const graderTool = tool(
  async (arg: BooleanGraderToolParamSchema) => JSON.stringify(arg),
  {
    name: "grader",
    description:
      "Grade the generation of the model for whether it is grounded in / supported by a set of facts. Give a boolean grade true or false, where true means that the generation is grounded in a set of facts.",
    schema: booleanGraderToolParamSchema,
  }
);

async function gradeGenerationGrounded(
  state: GraphState
): Promise<Pick<GraphState, "generationGrounded">> {
  console.log("<---- GRADE GENERATION GROUNDED ---->");
  const { generations = [], documents } = state;

  const currentGeneration = generations.at(-1) ?? new AIMessage("");

  /**
   * @param documents - Document[] -> string
   * @param generation - AIMessage -> string
   */
  const prompt = await pull<ChatPromptTemplate<PromptTemplateInput>>(
    "bianbianzhu/generation-grounded"
  );

  const chatModel = new ChatOpenAI({
    temperature: 0,
    modelName: "gpt-4o-mini",
  });

  const modelWithTools = chatModel.bindTools([graderTool], {
    runName: "gradeGenerationGrounded",
    tool_choice: {
      type: "function",
      function: { name: graderTool.name },
    },
  });

  const parser = new JsonOutputToolsParser();

  const chain = prompt.pipe(modelWithTools).pipe(parser);

  const res = await chain.invoke({
    documents: formatDocumentsAsString(documents),
    generation: currentGeneration.content as string,
  });

  return {
    generationGrounded: res[0].args as BooleanGraderToolParamSchema,
  };
}

export default gradeGenerationGrounded;
