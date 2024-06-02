import { ChatOpenAI } from "@langchain/openai";
import readline from "readline";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { VectorStore } from "@langchain/core/vectorstores";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { formatDocumentsAsString } from "langchain/util/document";

const URL = "https://js.langchain.com/v0.2/docs/how_to/";

const SYSTEM_PROMPT = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
{context}`;

const HISTORY_AWARE_INSTRUCTION_TEMPLATE = `Given the above conversation, generate a search query to look up in order to get information relevant to the conversation`;

const chatHistory: BaseMessage[] = [];

const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  new MessagesPlaceholder("chat_history"),
  ["user", `Question: {input}`],
]);

const historyAwarePromptTemplate = ChatPromptTemplate.fromMessages([
  new MessagesPlaceholder("chat_history"),
  ["user", `Question: {input}`],
  ["user", HISTORY_AWARE_INSTRUCTION_TEMPLATE],
]);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const chatModel = new ChatOpenAI({
  modelName: "gpt-4o",
});

async function createVectorStore(): Promise<VectorStore> {
  const loader = new CheerioWebBaseLoader(URL);

  const docs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 0,
  });

  const splittedDocs = await splitter.splitDocuments(docs);

  const embeddings = new OpenAIEmbeddings();

  const vectorStore = await MemoryVectorStore.fromDocuments(
    splittedDocs,
    embeddings
  );

  return vectorStore;
}

async function main() {
  const combineDocsChain = await createStuffDocumentsChain({
    llm: chatModel,
    prompt: promptTemplate,
  });

  const vectorStore = await createVectorStore();
  const retriever = vectorStore.asRetriever(3);

  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm: chatModel,
    rephrasePrompt: historyAwarePromptTemplate,
    retriever,
  });

  const retrievalChain = await createRetrievalChain({
    combineDocsChain,
    retriever: historyAwareRetriever,
  });

  function chat() {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      const response = await retrievalChain.invoke({
        input,
        chat_history: chatHistory,
      });

      console.log(`Assistant: ${response.answer}`);
      chatHistory.push(new HumanMessage(input));
      chatHistory.push(new AIMessage(response.answer));

      chat();
    });
  }

  chat();
}

main();

type OriginalInput = {
  input: string;
  chat_history: BaseMessage[];
};

async function mainWithRunnables() {
  const vectorStore = await createVectorStore();
  const retriever = vectorStore.asRetriever(3);

  const chain = RunnableSequence.from<OriginalInput, string>([
    {
      input: ({ input }) => input,
      chat_history: ({ chat_history }) => chat_history,
      context: RunnableSequence.from([
        historyAwarePromptTemplate
          .pipe(chatModel)
          .pipe(new StringOutputParser()),
        retriever.pipe(formatDocumentsAsString),
      ]),
    },
    promptTemplate,
    chatModel,
    new StringOutputParser(),
  ]);

  function chat() {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      const response = await chain.invoke({
        input,
        chat_history: chatHistory,
      });

      console.log(`Assistant: ${response}`);
      chatHistory.push(new HumanMessage(input));
      chatHistory.push(new AIMessage(response));

      chat();
    });
  }

  chat();
}

// mainWithRunnables();
