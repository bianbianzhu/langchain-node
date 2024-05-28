import { ChatOpenAI, OpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const llm = new OpenAI({
  model: "gpt-3.5-turbo-instruct",
});

const chatModel = new ChatOpenAI({
  model: "gpt-3.5-turbo",
});

async function fromTemplate() {
  const promptTemplate = ChatPromptTemplate.fromTemplate(
    "How big is the biggest {animal_name} in {country_name}?"
  );

  const stringPrompt = await promptTemplate.format({
    animal_name: "elephant",
    country_name: "India",
  });

  stringPrompt;

  const stringPromptMessages = await promptTemplate.formatMessages({
    animal_name: "elephant",
    country_name: "India",
  });

  stringPromptMessages;

  const messageTemplate = ChatPromptTemplate.fromMessages<{
    animal_name: string;
    country_name: string;
  }>([
    ["system", "Your are an animal export."],
    ["human", "How big is the biggest {animal_name}"],
    ["human", "What is the biggest {animal_name} in {country_name}?"],
  ]);

  const messagePrompt = await messageTemplate.format({
    animal_name: "elephant",
    country_name: "India",
  });

  messagePrompt;

  const messagePromptMessages = await messageTemplate.formatMessages({
    animal_name: "elephant",
    country_name: "India",
  });

  const chain = messageTemplate.pipe(chatModel);

  const response = await chain.invoke({
    animal_name: "elephant",
    country_name: "India",
  });

  console.log(response.content);

  messagePromptMessages;

  console.log(promptTemplate);
}

fromTemplate();
