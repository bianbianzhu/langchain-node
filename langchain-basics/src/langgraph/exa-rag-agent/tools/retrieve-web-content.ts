import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ExaRetriever, ExaSearchResults } from "@langchain/exa";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import Exa from "exa-js";

const retrieveToolParamSchema = z.object({
  query: z.string().describe("The query to search for"),
});

const retrieveWebContent = tool(retrieve, {
  name: "web_content_retriever",
  description: "Function to retrieve usable documents for AI assistant",
  schema: retrieveToolParamSchema,
});

async function retrieve(
  args: z.infer<typeof retrieveToolParamSchema>
): Promise<any> {
  const { query } = args;

  const client = new Exa(process.env.EXA_API_KEY);

  //  extract highlights and improves the query with use_autoprompt
  const retriever = new ExaRetriever({
    client,
    searchArgs: { numResults: 3, useAutoprompt: true, highlights: true },
  });

  // const searchResults = new ExaSearchResults({
  //   client,
  //   searchArgs: { numResults: 3 },
  // });

  const documents = await retriever.invoke(query); // return an array of Document objects

  const;

  // const resultString = await searchResults.invoke(query); // Return a JSON string

  // const promptTemplate = ChatPromptTemplate.fromMessages([
  //   ['']
  // ])
}

retrieve({ query: "What is weather in melbourne" });
