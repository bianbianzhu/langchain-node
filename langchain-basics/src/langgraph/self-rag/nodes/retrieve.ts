import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GraphState } from "../graph-state";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";

const URLS = [
  "https://www.zockify.com/wowclassic/sod/",
  "https://www.zockify.com/wowclassic/sod/runes/",
  "https://www.zockify.com/wowclassic/sod/demon-fall-canyon/",
  //   "https://python.langchain.com/v0.2/docs/introduction/",
];

async function retrieve(
  state: GraphState
): Promise<Pick<GraphState, "documents">> {
  console.log("<---- RETRIEVE ---->");
  const { questions } = state;

  const currentQuestion = questions.at(-1) ?? "";

  const docs2DList = await Promise.all(
    URLS.map((url) => {
      const loader = new CheerioWebBaseLoader(url, { selector: "main" });

      return loader.load();
    })
  );

  const docs = docs2DList.flat(1);

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
