import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { BaseDocumentLoader } from "langchain/document_loaders/base";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { VectorStore } from "@langchain/core/vectorstores";

const URL =
  "https://www.corelogic.com.au/news-research/news/2024/monthly-housing-chart-pack-may-2024";

export const loader = new CheerioWebBaseLoader(URL);

export async function createVectorStore(
  loader: BaseDocumentLoader
): Promise<VectorStore> {
  const docs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
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
