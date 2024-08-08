import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputToolsParser } from "langchain/output_parsers";
import { tool } from "@langchain/core/tools";
import { GraphState } from "../graph-state";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { graderToolParamSchema, GraderToolParamSchema } from "../shared-utils";

type PromptTemplateInput = {
  context: string;
  question: string;
};

const graderTool = tool(
  async (arg: GraderToolParamSchema): Promise<string> => JSON.stringify(arg), // this function body is simply a placeholder
  //FIX: the arg needs no type as it can be inferred from the schema
  {
    name: "grader",
    description:
      "Score the retrieved documents for whether they are relevant to the question. Give a binary score 1 or 0 score, where 1 means that the document is relevant to the question.",
    schema: graderToolParamSchema,
  } // somehow these args are not required for the user to input and will be automatically filled by the model - which is then parsed by the parser and ready to be used
);

async function gradeDocuments(
  state: GraphState
): Promise<Pick<GraphState, "documents">> {
  console.log("<---- GRADE DOCUMENTS---->");
  const { questions, documents } = state;

  const chatModel = new ChatOpenAI({
    temperature: 0,
    modelName: "gpt-4o-mini",
  });

  //   To specify a particular function, set tool_choice to an object with type: "function" and include the function's name and details. For instance, tool_choice: { type: "function", function: { name: "get_farms"}} tells the model to call the get_farms function regardless of the context. Even a simple user prompt like "Hi." will trigger this function call.
  const modelWithTools = chatModel.bindTools([graderTool], {
    runName: "gradeEachRetrievedDocument",
    tool_choice: {
      type: "function",
      function: {
        name: graderTool.name,
      },
    },
  });

  /**
   * @param context - string (ONE document's pageContent)
   * @param question - string
   */
  const prompt = await pull<ChatPromptTemplate<PromptTemplateInput>>(
    "bianbianzhu/rag-document-relevance"
  );

  /**
   * Parses the output and returns a JSON object. If `argsOnly` is true,
   * only the arguments of the function call are returned.
   * @param generations The output of the LLM to parse.
   * @returns A JSON object representation of the function call or its arguments.
   */
  const parser = new JsonOutputToolsParser();

  const chain = prompt.pipe(modelWithTools).pipe(parser);

  // can't use createStuffDocumentsChain because the outputParser must be BaseOutputParser (extends BaseLLMOutputParser) and conflicts with the JsonOutputToolsParser (extends BaseLLMOutputParser) + for context, only one document is passed in each iteration of the loop

  const currentQuestion = questions.at(-1) ?? "";

  const filteredDocuments: Document[] = [];

  for await (const doc of documents) {
    const response = await chain.invoke({
      context: doc.pageContent,
      question: currentQuestion,
    }); // type safe

    if (response[0].args.score === 1) {
      filteredDocuments.push(doc);
    }
  }

  return {
    documents: filteredDocuments,
  };
}

// define the output schema. JsonOutputToolsParser will parse tool calls out of a chat model response. in this case the function body itself is a placeholder

export default gradeDocuments;
