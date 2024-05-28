import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { BaseDocumentLoader } from "langchain/document_loaders/base";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { VectorStore } from "@langchain/core/vectorstores";

const URL = "https://docs.smith.langchain.com/old";

export const loaders = {
  webLoader: new CheerioWebBaseLoader(URL),
};

export async function createVectorStore(
  loader: BaseDocumentLoader
): Promise<VectorStore> {
  const docs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 250,
    chunkOverlap: 20,
  });

  const splittedDocs = await splitter.splitDocuments(docs);

  const embeddings = new OpenAIEmbeddings();

  const vectorStore = await MemoryVectorStore.fromDocuments(
    splittedDocs,
    embeddings
  );

  return vectorStore;
}
