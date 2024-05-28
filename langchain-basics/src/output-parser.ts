import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import {
  StringOutputParser,
  CommaSeparatedListOutputParser,
} from "@langchain/core/output_parsers";

const chatModel = new ChatOpenAI({
  model: "gpt-3.5-turbo",
  temperature: 0,
});

async function main() {
  const promptTemplate = ChatPromptTemplate.fromTemplate(`
    name the capital of the United States, Japan and {country}
`);

  const outputParser = new StringOutputParser();

  const commonListParser = new CommaSeparatedListOutputParser();

  const chain = promptTemplate.pipe(chatModel).pipe(outputParser);

  const instruction = outputParser.getFormatInstructions(); // no argument

  const instruction2 = commonListParser.getFormatInstructions();

  const parsedString = await outputParser.parse(
    "This is first line\n" + "This is second line\n\n"
  );

  const response = await chain.stream({
    country: "Australia",
  });

  for await (const chunk of response) {
    console.log(chunk);
  }
}

main();
