import {
  END,
  MemorySaver,
  START,
  StateGraph,
  StateGraphArgs,
} from "@langchain/langgraph";
import { Document } from "@langchain/core/documents";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { VectorStoreRetriever } from "@langchain/core/vectorstores";
import { pull } from "langchain/hub";
import { formatDocumentsAsString } from "langchain/util/document";
import { z } from "zod";
import { ChatPromptTemplate, StructuredPrompt } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { visualization } from "./visualization";

interface State {
  queries: string[];
  documents: Document[];
  chat_history: BaseMessage[];
  generations?: AIMessage[];
  transformCount?: number;
}

const chatModel = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
});

// check this: https://langchain-ai.github.io/langgraphjs/concepts/#state-management

function updateState<T>(fallback: T) {
  return (previous?: T, current?: T) =>
    current ? current : previous ?? fallback;
}

const graphState: StateGraphArgs<State>["channels"] = {
  queries: {
    default: () => [],
    reducer: (x, y) => x.concat(y),
  },
  documents: {
    default: () => [],
    // Don't use `b.length > 0 ? b : a` as sometimes `b` can be an empty array but you still want to keep it
    reducer: (a: Document[], b: Document[]) => (b ? b : a),
  },
  chat_history: {
    default: () => [],
    reducer: (x, y) => x.concat(y),
  },
  generations: {
    default: () => [],
    reducer: (x = [], y = []) => x.concat(y),
  },
  transformCount: {
    default: () => 0,
    reducer: (x = 0, y = 0) => {
      console.log("Transform count x: ", x);
      console.log("Transform count y: ", y);
      console.log("Transform count sum: ", x + y);
      return x + y;
    },
  },
};

const workflow = new StateGraph<State>({ channels: graphState });

const checkpointer = new MemorySaver();

// =============1. function for node "retriever"======================

async function createRetriever(): Promise<VectorStoreRetriever<HNSWLib>> {
  const loader = new CheerioWebBaseLoader(
    "https://lilianweng.github.io/posts/2023-06-23-agent/"
  );

  const docs = await loader.load();
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 250,
    chunkOverlap: 20,
  });

  const splittedDocs = await splitter.splitDocuments(docs);

  const embeddings = new OpenAIEmbeddings();

  const vectorStore = await HNSWLib.fromDocuments(splittedDocs, embeddings);

  return vectorStore.asRetriever(3);
}

//TODO: check langgraph_crag in langgraphjs

async function retrieve(state: State): Promise<Pick<State, "documents">> {
  console.log("----RETRIEVE-NODE---");

  const { queries } = state;

  if (queries.length === 0) {
    throw new Error("No queries to retrieve");
  }

  const lastQuery = queries.at(-1) ?? "";
  const retriever = await createRetriever();

  //TODO: question: if no documents are found, what will be the output? an empty array?
  const documents = await retriever
    .withConfig({ runName: "fetchRelevantDocuments" })
    .invoke(lastQuery);

  return { documents };
}

// 2. ============= function for node "gradeDocuments" ======================
async function gradeDocuments(state: State): Promise<Pick<State, "documents">> {
  console.log("----GRADE-DOCUMENTS-NODE---");

  const { documents, queries } = state;

  if (documents.length === 0) {
    throw new Error("No documents to grade");
  }

  const lastQuery = queries.at(-1) ?? "";

  /**  This prompt ( StructuredPrompt ) does 2 things:
   * 1. Grades the relevance of the document to the query by Binary sore (0 or 1)
   * 2. Format the output in a structured way, like:
   *   {
   *     Score: 0,
   *     Explaination: "The user question is a simple arithmetic problem, 'what is 1 + 1'. The retrieved document does not seem to be related to arithmetic or mathematics based on the provided information."
   * }
   *
   * @param input - object with documents and question
   * @param input.documents - MUST BE a string or string array. CANNOT be a Document object or Document array. Use formatDocumentsAsString to convert Document array to string.
   * @param input.question - string
   */
  const prompt = await pull<
    StructuredPrompt<{ input: { documents: string; question: string } }>
  >("rlm/rag-document-relevance");
  //   https://smith.langchain.com/hub/rlm/rag-document-relevance?organizationId=eac111ad-b0fe-524a-8a39-b21e9e078e3a&tab=0

  // NOT SURE IF PROMPT IS ENOUGH for the structured output
  // also check this: https://js.langchain.com/v0.2/docs/how_to/structured_output/
  // return structured data from a model

  // currently it has a bug, Structured prompts need to be piped to a language model that supports the "withStructuredOutput()" method.
  // The model definitely supports structured output, but the prompt from hub seems to be the cause.
  const gradeResultSchema = z.object({
    Score: z.number().int().min(0).max(1),
    Explaination: z.string(),
  });

  // const structuredModel = chatModel.withStructuredOutput(gradeResultSchema);

  const passedDocuments: Document[] = [];

  const chain = prompt.pipe(chatModel);

  for await (const doc of documents) {
    const gradeResult = await chain.invoke({
      input: {
        documents: formatDocumentsAsString([doc]),
        question: lastQuery,
      },
    });

    const result = gradeResultSchema.safeParse(gradeResult);
    if (!result.success) {
      throw new Error(
        `Grade result from model violates schema: ${result.error}`
      );
    }

    doc.metadata = { ...doc.metadata, ...result.data };

    if (result.data.Score === 1) {
      passedDocuments.push(doc);
    }
  }

  console.log("Passed documents: ", passedDocuments);

  return { documents: passedDocuments };
}

// 3. ============= function for node "callModel" ======================

async function callModel(
  state: State
): Promise<Pick<State, "generations" | "chat_history">> {
  console.log("----CALL-MODEL-NODE---");

  const { queries, documents, chat_history } = state;

  const lastQuery = queries.at(-1) ?? "";

  /**
   * @param question - string
   * @param context - string
   */
  const fStringPrompt = `You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.
  
  Context: {context}`;

  /**
   * Why not using rlg/rag-prompt from hub?
   * It cannot pass chat_history as a variable to the prompt
   */
  const chatPromptTemplate = ChatPromptTemplate.fromMessages<{
    context: string;
    question: string;
    chat_history: BaseMessage[];
  }>([
    ["system", fStringPrompt],
    ["placeholder", "{chat_history}"],
    [
      "user",
      `Question: {question}
      Answer:`,
    ],
  ]);

  const chain = chatPromptTemplate.pipe(chatModel);

  const response = await chain.invoke({
    context: formatDocumentsAsString(documents),
    question: lastQuery,
    chat_history,
  });

  return {
    generations: [response],
    chat_history: [new HumanMessage(lastQuery), response],
  };
}

async function transformQuery(
  state: State
): Promise<Pick<State, "queries" | "transformCount">> {
  console.log("----TRANSFORM-QUERY-NODE---");

  const { queries } = state;
  const lastQuery = queries.at(-1) ?? "";

  const prompt = ChatPromptTemplate.fromTemplate<{
    question: string;
  }>(`You are generating a question that is well optimized for semantic search retrieval.
  Look at the input and try to reason about the underlying sematic intent / meaning.
  Here is the initial question:
  \n ------- \n
  {question} 
  \n ------- \n
  Formulate an improved question: `);

  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  });

  const chain = prompt.pipe(model).pipe(new StringOutputParser());

  const response = await chain.invoke({
    question: lastQuery,
  });

  return { queries: [response], transformCount: 1 };
}

function shouldTransformQuery(state: State): "transformQuery" | "callModel" {
  console.log("----SHOULD-TRANSFORM-QUERY---");

  const { documents, transformCount = 0 } = state;

  if (documents.length < 2 && transformCount < 2) {
    console.log("----Path: Transforming query----");
    return "transformQuery";
  }

  console.log("----Path: Calling model----");
  return "callModel";
}

workflow
  .addNode("retriever", retrieve)
  .addNode("gradeDocuments", gradeDocuments)
  .addNode("callModel", callModel)
  .addNode("transformQuery", transformQuery)
  .addEdge(START, "retriever")
  .addEdge("retriever", "gradeDocuments")
  .addConditionalEdges("gradeDocuments", shouldTransformQuery, {
    // must specify the nodes to draw the image (for visualization)
    transformQuery: "transformQuery",
    callModel: "callModel",
  })
  .addEdge("transformQuery", "retriever")
  .addEdge("callModel", END);

const app = workflow.compile({ checkpointer });

visualization(app);

const config = { configurable: { thread_id: "42" } };

async function main() {
  // const firstState = await app.invoke(
  //   {
  //     queries: ["What is Chain of Hindsight?"],
  //   },
  //   config
  // );

  const nextState = await app.invoke(
    {
      queries: ["Is Short-Term Memory (STM) better than long-term memory?"],
    },
    config
  );

  // console.log(firstState);
  console.log(nextState);
}

main();
