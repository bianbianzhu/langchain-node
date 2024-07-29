import { pull } from "langchain/hub";
import { GraphState } from "../graph-state";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

type PromptTemplateInput = {
  question: string;
};

async function rewriteQuery(
  state: GraphState
): Promise<Pick<GraphState, "questions" | "count">> {
  console.log("<---- REWRITE QUERY ---->");
  const { questions, count } = state;
  const currentQuestion = questions.at(-1) ?? "";

  const chatModel = new ChatOpenAI({
    temperature: 0.3,
    model: "gpt-4o-mini",
  });

  /**
   * @param question - string
   */
  const prompt = await pull<ChatPromptTemplate<PromptTemplateInput>>(
    "efriis/self-rag-question-rewriter"
  );

  const chain = prompt.pipe(chatModel).pipe(new StringOutputParser());

  const optimizedQuestion = await chain.invoke({
    question: currentQuestion,
  });

  return {
    questions: [optimizedQuestion],
    count: { rewriteQuery: 1, regenerate: 0 },
  };
}

export default rewriteQuery;
