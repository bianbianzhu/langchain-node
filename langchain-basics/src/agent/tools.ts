import { StructuredToolInterface, ToolInterface } from "@langchain/core/tools";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { createRetrieverTool } from "langchain/tools/retriever";
import { createRetriever, loader } from "./vectorStore";
import { SqlToolkit } from "langchain/agents/toolkits/sql";
import { DataSource } from "typeorm";
import { SqlDatabase } from "langchain/sql_db";
import { chatModel } from "./chatModel";

export async function createTools(): Promise<StructuredToolInterface[]> {
  // create and assign tools
  const searchTool = new TavilySearchResults({
    maxResults: 1,
  });

  const retriever = await createRetriever(loader);
  const retrieverTool = createRetrieverTool(retriever, {
    name: "CoreLogic_property_data_search", // this must follow pattern strings that consist solely of one or more letters, digits, underscores, or hyphens.
    description: `Use this tool when searching for information about real estate properties.
       Use this tool when the keyword "property", "house", "real estate" is mentioned in the user's query.`,
  });

  const dataSource = new DataSource({
    type: "sqlite",
    database: "Chinook.db",
  });

  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: dataSource,
  });

  const sqlToolKit = new SqlToolkit(db, chatModel);
  const sqlTools: ToolInterface[] = sqlToolKit.getTools();
  /**
   * interface ToolInterface extends StructuredToolInterface
   */
  const tools: StructuredToolInterface[] = [
    searchTool,
    retrieverTool,
    ...sqlTools,
  ];

  return tools;
}
