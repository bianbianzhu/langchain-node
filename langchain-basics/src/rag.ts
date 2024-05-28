import readline from "readline";
import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { VectorStore } from "@langchain/core/vectorstores";
import { createRetrievalChain } from "langchain/chains/retrieval";
import {
  SystemMessage,
  AIMessage,
  BaseMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";

const url =
  "https://www.corelogic.com.au/news-research/news/2024/housing-values-rise-0.6-in-april,-as-low-supply-trumps-high-interest-rates-and-inflation";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const chatHistory: BaseMessage[] = [
  new SystemMessage("You are a real estate agent."),
];

const chatModel = new ChatOpenAI({
  model: "gpt-3.5-turbo",
  temperature: 0,
});

async function createVectorStore() {
  const loader = new CheerioWebBaseLoader(url);

  const docs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  const splittedDocs = await splitter.splitDocuments(docs);

  const embeddings = new OpenAIEmbeddings();

  const vectorStore = await MemoryVectorStore.fromDocuments(
    splittedDocs,
    embeddings
  );

  return vectorStore;
}

async function createRetriever(llm: BaseChatModel, vectorStore: VectorStore) {
  const retriever = vectorStore.asRetriever({
    k: 2,
  });

  const historyAwarePrompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    [
      "human",
      "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
    ],
  ]);

  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm,
    retriever,
    rephrasePrompt: historyAwarePrompt,
  });

  return historyAwareRetriever;
}

async function createChain(llm: BaseChatModel, retriever: Runnable) {
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", "Answer the user's question based on the context: {context}"],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  const documentChain = await createStuffDocumentsChain({
    llm,
    prompt: promptTemplate,
  });

  const conversationChain = await createRetrievalChain({
    combineDocsChain: documentChain,
    retriever,
  });

  return conversationChain;
}

async function processInput(input: string) {
  const vectorStore = await createVectorStore();
  const retriever = await createRetriever(chatModel, vectorStore);
  const chain = await createChain(chatModel, retriever);

  chatHistory.push(new HumanMessage(input));

  const response = await chain.invoke({
    input,
    chat_history: chatHistory,
  });

  console.log(`Assistant: ${response.answer}`);

  chatHistory.push(new AIMessage(response.answer));

  if (input === "exit") {
    rl.close();
  } else {
    rl.prompt();
  }
}

rl.setPrompt("You: ");
rl.prompt();
rl.on("line", processInput);
