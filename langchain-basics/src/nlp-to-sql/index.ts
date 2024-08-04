import { DataSource } from "typeorm";
import { SqlDatabase } from "langchain/sql_db";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

async function main() {
  /**
   * This example uses Chinook database, which is a sample database available for SQL Server, Oracle, MySQL, etc.
   * To set it up follow the instructions on https://database.guide/2-sample-databases-sqlite/, placing the .db file in the examples folder.
   */

  /**
   * 1. use the Chinook_Sqlite.sql script to generate the database
   * 2. copy the generated chinook.db file to the src/nlp-to-sql folder
   * 3. use the path as `database` in the `DataSource` object
   */
  const dataSource = new DataSource({
    type: "sqlite",
    database: "./src/nlp-to-sql/chinook.db", // Path to the database file
  });

  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: dataSource,
  });

  const llm = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
  });

  /**
   * Create the first prompt template used for getting the SQL query.
   */
  const prompt =
    ChatPromptTemplate.fromTemplate(`Based on the provided SQL table schema below, write a SQL query that would answer the user's question.
------------
SCHEMA: {schema}
------------
QUESTION: {question}
------------
SQL QUERY:`);
  /**
   * You can also load a default prompt by importing from "langchain/sql_db"
   *
   * import {
   *   DEFAULT_SQL_DATABASE_PROMPT
   *   SQL_POSTGRES_PROMPT
   *   SQL_SQLITE_PROMPT
   *   SQL_MSSQL_PROMPT
   *   SQL_MYSQL_PROMPT
   *   SQL_SAP_HANA_PROMPT
   * } from "langchain/sql_db";
   *
   */

  /**
   * Create a new RunnableSequence where we pipe the output from `db.getTableInfo()`
   * and the users question, into the prompt template, and then into the llm.
   * We're also applying a stop condition to the llm, so that it stops when it
   * sees the `\nSQLResult:` token.
   */
  const sqlQueryChain = RunnableSequence.from<{ question: string }>([
    {
      schema: async () => await db.getTableInfo(),
      question: (input) => input.question,
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  // const res = await sqlQueryChain.invoke({
  //   question: "How many Albums are there?",
  // });
  // console.log({ res });

  /**
   * { res: 'SELECT COUNT(*) FROM tracks;' }
   */

  /**
   * Create the final prompt template which is tasked with getting the natural language response.
   */
  const finalResponsePrompt =
    ChatPromptTemplate.fromTemplate(`Based on the table schema below, question, SQL query, and SQL response, write a natural language response:
------------
SCHEMA: {schema}
------------
QUESTION: {question}
------------
SQL QUERY: {query}
------------
SQL RESPONSE: {response}
------------
NATURAL LANGUAGE RESPONSE:`);

  /**
   * Create a new RunnableSequence where we pipe the output from the previous chain, the users question,
   * and the SQL query, into the prompt template, and then into the llm.
   * Using the result from the `sqlQueryChain` we can run the SQL query via `db.run(input.query)`.
   */
  const finalChain = RunnableSequence.from<{ question: string }>([
    {
      question: (input) => input.question,
      query: sqlQueryChain, // The problem is this query is not sanitized to pure SQL but with other model generated text
    },
    {
      schema: async () => await db.getTableInfo(),
      question: (input) => input.question,
      query: (input) => input.query,
      response: async (input) => await db.run(input.query),
      // `SELECT g.Name AS Genre, COUNT(il.InvoiceLineId) AS TrackCount
      //   FROM InvoiceLine il
      //   JOIN Track t ON il.TrackId = t.TrackId
      //   JOIN Genre g ON t.GenreId = g.GenreId
      //   GROUP BY g.Name
      //   ORDER BY TrackCount DESC
      //   LIMIT 1;`
    },
    finalResponsePrompt,
    llm,
    new StringOutputParser(),
  ]);

  const finalResponse = await finalChain.invoke({
    question: "Which genre is the most popular?",
  });

  console.log({ finalResponse });

  /**
   * { finalResponse: 'There are 8 employees.' }
   */
}

main();
