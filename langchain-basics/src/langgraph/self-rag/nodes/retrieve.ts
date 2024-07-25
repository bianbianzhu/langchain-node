import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GraphState } from "../graph-state";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";

const URL = "https://lilianweng.github.io/posts/2023-06-23-agent/";

async function retrieve(
  state: GraphState
): Promise<Pick<GraphState, "documents">> {
  const { questions } = state;

  const currentQuestion = questions.at(-1) ?? "";

  const loader = new CheerioWebBaseLoader(URL);

  const docs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const splittedDocs = await splitter.splitDocuments(docs);
  const embeddings = new OpenAIEmbeddings();

  const vectorStore = await HNSWLib.fromDocuments(splittedDocs, embeddings);

  const retriever = vectorStore.asRetriever(3);

  const relevantDocs = await retriever
    .withConfig({ runName: "fetchRelevantDocuments" })
    .invoke(currentQuestion);

  return {
    documents: relevantDocs,
  };
}

export default retrieve;
