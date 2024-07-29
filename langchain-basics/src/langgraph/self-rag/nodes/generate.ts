import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "../graph-state";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";

type PromptTemplateInput = {
  question: string;
  context: string;
  chat_history: BaseMessage[];
};

async function generate(
  state: GraphState
): Promise<Pick<GraphState, "generations" | "chatHistory" | "count">> {
  console.log("<---- GENERATE ---->");
  const { questions, documents, chatHistory } = state;

  const chatModel = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.4,
  });

  const currentQuestion = questions.at(-1) ?? "";

  /**
   * Pulled from the hub and have the following required input variables
   * @param question - string
   * @param context - string (formatted documents)
   * @param chat_history - List of messages
   */
  const prompt = await pull<ChatPromptTemplate<PromptTemplateInput>>(
    "bianbianzhu/rag-with-history"
  );

  /**
   * @function createStuffDocumentsChain
   * @param prompt Defined by the function and must contain input variable "context"
   * This function does 3 things:
   * 1. format the documents as a string for `context` - so you can pass the documents to context without do `formatDocumentsAsString`
   * 2. create a chain that pipes the prompt and the chatModel
   * 3. parse the output to a string (by default the outputParser is StringOutputParser)
   */
  const chain = await createStuffDocumentsChain({
    llm: chatModel,
    prompt,
  });

  const response = await chain
    .withConfig({ runName: "generateAnswer" })
    .invoke({
      context: documents, // must be Document[]
      question: currentQuestion,
      chat_history: chatHistory,
    }); // not type safe

  return {
    generations: [new AIMessage(response)],
    chatHistory: [new HumanMessage(currentQuestion), new AIMessage(response)],
    count: { regenerate: 1, rewriteQuery: 0 },
  };
}

export default generate;
