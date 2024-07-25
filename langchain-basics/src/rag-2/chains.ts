import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { chatModel } from "./chat-model";
import { createVectorStore, loaders } from "./vectorStore";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { createRetrievalChain } from "langchain/chains/retrieval";

const chatPromptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are assistant that can answer the following questions based on Context: {context}",
  ],
  new MessagesPlaceholder("chat_history"),
  ["user", "Question: {input}"],
]);

const historyAwarePromptTemplate = ChatPromptTemplate.fromMessages([
  new MessagesPlaceholder("chat_history"),
  ["user", "Question: {input}"],
  [
    "user",
    "Using the above conversations, generate a standalone search query to get relevant information.",
  ],
]);

export async function createChain() {
  const documentChain = await createStuffDocumentsChain({
    llm: chatModel,
    prompt: chatPromptTemplate,
  });

  const vectorStore = await createVectorStore(loaders.webLoader);
  const retriever = vectorStore.asRetriever(3);

  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm: chatModel,
    retriever,
    rephrasePrompt: historyAwarePromptTemplate,
  });

  const conversationChain = await createRetrievalChain({
    retriever: historyAwareRetriever,
    combineDocsChain: documentChain,
  });

  return conversationChain;
}
