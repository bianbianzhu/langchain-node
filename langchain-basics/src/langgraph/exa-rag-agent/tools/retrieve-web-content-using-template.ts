import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Exa from "exa-js";
import { ExaRetriever } from "@langchain/exa";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { DocumentInterface } from "@langchain/core/documents";
import { BaseMessage } from "@langchain/core/messages";

const retrieveToolParamSchema = z.object({
  query: z.string().describe("The query to search for"),
});

type RetrieveToolParam = z.infer<typeof retrieveToolParamSchema>;

type PromptTemplateInput = {
  url: string;
  highlights: string;
};

const retrieveWebContentUsingTemplate = tool(retrieve, {
  name: "web_content_retriever_using_template",
  description: "Function to retrieve usable documents for AI assistant",
  schema: retrieveToolParamSchema,
});

async function retrieve(args: RetrieveToolParam) {
  const { query } = args;

  const client = new Exa(process.env.EXA_API_KEY);
  const retriever = new ExaRetriever({
    client,
    searchArgs: { numResults: 3, useAutoprompt: true, highlights: true },
  });

  const documents = await retriever.invoke(query);

  const fString = `<source>
        <url>{url}</url>
        <highlights>{highlights}</highlights>
    </source>`;

  const promptTemplate = ChatPromptTemplate.fromMessages<PromptTemplateInput>([
    ["human", fString],
  ]);

  const documentToMessageChain = RunnableSequence.from<
    DocumentInterface<Record<string, any>>
  >([
    (document): PromptTemplateInput => ({
      url: document.metadata.url,
      highlights: document.metadata.highlights.toString(),
    }),
    promptTemplate,
  ]);

  const test = await documentToMessageChain.invoke(documents[0]);

  console.log(test);

  const chain = RunnableSequence.from<string, any>([
    retriever,
    (
      documents: DocumentInterface<Record<string, any>>[]
    ): PromptTemplateInput[] =>
      documents.map((document) => ({
        url: document.metadata.url,
        highlights: document.metadata.highlights.toString(),
      })),
  ]);

  //   const prompts = await chain.invoke(query);
}

retrieve({ query: "Latest research papers on climate technology" });
