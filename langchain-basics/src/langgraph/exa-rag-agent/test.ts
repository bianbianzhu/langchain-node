import { ChatPromptTemplate } from "@langchain/core/prompts";

(async () => {
  const messageTemplate = ChatPromptTemplate.fromMessages<{
    animal_name: string;
    country_name: string; // must pass the type here
  }>([
    ["system", "Your are an animal export."],
    ["human", "How big is the biggest {animal_name}"],
    ["human", "What is the biggest {animal_name} in {country_name}?"],
  ]);

  const messagePrompt = await messageTemplate.format({
    animal_name: "elephant",
    country_name: "India",
  });

  messagePrompt; // string
  // 'System: Your are an animal export.\nHuman: How big is the biggest elephant\nHuman: What is the biggest elephant in India?'

  console.log(messagePrompt);

  const messagePromptMessages = await messageTemplate.formatMessages({
    animal_name: "elephant",
    country_name: "India",
  });

  messagePromptMessages; // BaseMessage[ ]
  // [SystemMessage, HumanMessage, HumanMessage]

  console.log(messagePromptMessages);

  const final = await messageTemplate.invoke({
    animal_name: "elephant",
    country_name: "India",
  });

  console.log(final);
})();
