import { SqlDatabase } from "langchain/sql_db";
import { DataSource } from "typeorm";
import { SqlToolkit } from "langchain/agents/toolkits/sql";
import chatModel from "../utils/chat-model";
import { StructuredToolInterface } from "@langchain/core/tools";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { StringOutputParser } from "@langchain/core/output_parsers";

const DEFAULT_DB_PATH = "./src/langgraph/evaluate-agent/tools/chinook.db";

async function databaseInit(dbPath?: string): Promise<SqlDatabase> {
  const dataSource = new DataSource({
    type: "sqlite",
    database: dbPath ?? DEFAULT_DB_PATH,
  });

  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: dataSource,
  });

  // the return value from db.run is string and the parameter (SQL query) is string

  return db;
}

// =========== Custom Tool ===========
// 1. CheckQueryResultEmpty

const toolParamSchema = z.object({
  query_result: z
    .string()
    .describe("The result of the SQL query from a database"),
});

type ToolArgs = z.infer<typeof toolParamSchema>;

const checkQueryResultEmpty = tool(toolFunc, {
  name: "check_query_result_empty",
  description:
    "Use this tool to check the query result from the database to confirm it is not empty.",
  schema: toolParamSchema,
});

async function toolFunc(args: ToolArgs): Promise<string> {
  const { query_result } = args;

  const prompt = await pull<ChatPromptTemplate<{ query_result: string }>>(
    "bianbianzhu/sql_check_query_result_empty"
  );

  const chain = prompt.pipe(chatModel).pipe(new StringOutputParser());

  const res = await chain.invoke({ query_result }); // { shouldRetry: boolean }

  return res;
}

// =========== Toolkit ===========

async function createSQLTools(): Promise<StructuredToolInterface[]> {
  const db = await databaseInit();
  const toolkit = new SqlToolkit(db, chatModel);
  const tools = toolkit.getTools();
  /**
   * tools from the toolkit
   * 1. QuerySQLTool - SQL query -> Result from the database
   * 2. InfoSqlTool - list of tables -> schema and sample rows of those tables(call ListTablesSqlTool first to ensure the tables exist)
   * 3. ListTablesSqlTool - empty string -> list of tables in the database
   * 4. QueryCheckerTool - query -> grade :double check if the query has highlighted errors and rewrite if necessary
   * 5. llmChain - double check if your query is correct (call this before QuerySQLTool)
   */

  tools.push(checkQueryResultEmpty);

  return tools;
}

export default createSQLTools;
