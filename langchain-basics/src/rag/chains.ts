import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { chatModel } from "./chatModel";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createVectorStore, loader } from "./vectorStore";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import {
  RunnableSequence,
  RunnablePassthrough,
  Runnable,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { formatDocumentsAsString } from "langchain/util/document";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { LanguageModelLike } from "@langchain/core/language_models/base";

const SYSTEM_F_STRING_TEMPLATE = `You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.
Context: {context} 
Answer:`;

const HISTORY_AWARE_INSTRUCTION_TEMPLATE =
  "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation";

const promptTemplate = ChatPromptTemplate.fromMessages<{
  context: string;
  input: string;
}>([
  ["system", SYSTEM_F_STRING_TEMPLATE],
  new MessagesPlaceholder("chat_history"),
  ["user", "Question: {input}"],
]);

const historyAwarePromptTemplate = ChatPromptTemplate.fromMessages([
  new MessagesPlaceholder("chat_history"),
  ["user", "Question: {input}"],
  ["user", HISTORY_AWARE_INSTRUCTION_TEMPLATE],
]);

// just a type definition that ensures the following requirements:
// @param prompt
// Prompt template. Must contain input variable "context", which will be used for passing in the formatted documents.
type CreateStuffDocumentsChainReturnType = RunnableSequence<
  { context: string } & Record<string, unknown>,
  Exclude<string, Error>
>;

export async function createChain() {
  const documentChain = (await createStuffDocumentsChain({
    llm: chatModel,
    prompt: promptTemplate,
  })) as CreateStuffDocumentsChainReturnType;

  const vectorStore = await createVectorStore(loader);
  const retriever = vectorStore.asRetriever({
    k: 2,
  }); // equivalent to vectorStore.asRetriever(2);

  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm: chatModel,
    retriever,
    rephrasePrompt: historyAwarePromptTemplate,
  });

  const retrievalChain = await createRetrievalChain({
    combineDocsChain: documentChain,
    retriever: historyAwareRetriever,
  });

  return retrievalChain;
}

export async function createChainUsingRunnableSequence() {
  let question = "What is the change of listing level in my city?";
  const chatHistory: BaseMessage[] = [
    new HumanMessage("I live in melbourne"),
    new HumanMessage("I am looking for a house"),
  ];
  const vectorStore = await createVectorStore(loader);
  const retriever = vectorStore.asRetriever(5);

  const standaloneQuestionChain = RunnableSequence.from<{
    input: string;
    chat_history: BaseMessage[];
  }>([
    {
      input: ({ input }) => input,
      chat_history: ({ chat_history }) => chat_history,
    },
    historyAwarePromptTemplate,
    chatModel,
    new StringOutputParser(), // the returned value of a chatModel is a Message, we need to parse it to a string and pass it to the next runnable
  ]);

  const answerChain = RunnableSequence.from([
    {
      context: retriever.pipe(formatDocumentsAsString),
      input: new RunnablePassthrough(),
    },
    promptTemplate,
    chatModel,
    new StringOutputParser(),
  ]);

  const conversationalRetrievalQAChain =
    standaloneQuestionChain.pipe(answerChain);

  const response = await conversationalRetrievalQAChain.invoke({
    input: question,
    chat_history: chatHistory,
  });

  console.log(response);
}

// createChainUsingRunnableSequence();

export async function createChainUsingRunnableSequenceWithHistory() {
  let question = "What is the change of listing level in my city?";
  const chatHistory: BaseMessage[] = [
    new HumanMessage("I live in melbourne"),
    new HumanMessage("I am looking for a house"),
  ];
  const vectorStore = await createVectorStore(loader);
  const retriever = vectorStore.asRetriever(5);

  const historyAwareChain = historyAwarePromptTemplate
    .pipe(chatModel)
    .pipe(new StringOutputParser());

  type OriginalInput = {
    input: string;
    chat_history: BaseMessage[];
  };

  const conversationalRetrievalQAChain = RunnableSequence.from<
    OriginalInput,
    string
  >([
    {
      input: ({ input }) => input,
      chat_history: ({ chat_history }) => chat_history,
      output: historyAwareChain,
    },
    {
      context: RunnableSequence.from<OriginalInput & { output: string }>([
        (input) => input.output,
        retriever.pipe(formatDocumentsAsString),
      ]),
      input: ({ input }) => input,
      chat_history: ({ chat_history }) => chat_history,
    },
    promptTemplate,
    chatModel,
    new StringOutputParser(),
  ]);

  const response = await conversationalRetrievalQAChain.invoke({
    input: question,
    chat_history: chatHistory,
  });

  console.log(response);
}

// createChainUsingRunnableSequenceWithHistory();
