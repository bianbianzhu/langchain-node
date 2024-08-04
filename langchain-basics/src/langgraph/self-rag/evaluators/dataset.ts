import { Client } from "langsmith";
/*
  LangChainStringEvaluator type: CoT_QA
  ├── input (inputs from the dataset)
  ├── reference (reference outputs from the dataset)
  ├── prediction (response from the model based on the input)
  └── score: CORRECT or INCORRECT
*/

export const langsmithClient = new Client();

export const DATASET_NAME = "self-rag-02-08";

const inputs: Record<"input", string>[] = [
  {
    input:
      "As a fury warrior in phase 4 of SOD, what is the priority order of stats for maximizing DPS?",
  },
  {
    input: "As a holy paladin, which talents should I invest points toward?",
  },
  { input: "What are molten heat levels in SOD phase 4?" },
  { input: "How can I enter Demon Fall Canyon?" },
  { input: "What is the best profession for mage in SOD phase 4?" },
];

const referenceOutputs: Record<"output", string>[] = [
  {
    output: `Stat importance from most to least:

	1.	Hit Chance
	2.	Critical Strike Chance
	3.	Strength
	4.	Stamina`,
  },
  {
    output:
      "You should invest in talents such as Improved Devotion Aura, Improved Blessing of Might, Holy Shock, Healing Light, Divine Favor, and Illumination to boost group support, healing effectiveness, and mana sustainability.",
  },
  {
    output:
      "In SoD Phase 4 Molten Core, there are three Heat Levels: Sweltering (easiest, minimal Fire Resistance needed), Blistering (intermediate, +96 Fire Resistance), and Molten (hardest, +226 Fire Resistance). To set or change the Heat Level, speak with the Hydraxian Waterlords NPC at the entrance or use Aqual Quintessence. The new boss, The Molten Core, can only be engaged on Molten Heat and drops tier gear tokens but no exclusive rewards.",
  },
  {
    output: `To enter Demon Fall Canyon in WoW SoD Phase 4, follow these steps:

	1.	Reach level 55.
	2.	Accept the attunement quest “Demonic Deceptions” from the Shadowtooth Emissary in the Emerald Sanctuary in Felwood (coordinates 51.6, 82.0).
	3.	Kill Berserk Owlbeasts in Winterspring to collect 6 Owlbeast Pineal Glands.
	4.	Return to the Shadowtooth Emissary to complete the quest and receive the Shadowtooth Illusion Ward trinket.
	5.	Equip the Shadowtooth Illusion Ward and go to the Demon Fall Canyon entrance at 84.5, 75.0 in Ashenvale to enter the dungeon.`,
  },
  {
    output:
      "For a mage in WoW Classic Season of Discovery (SoD), the best professions are Enchanting and Tailoring. Enchanting allows you to enchant your gear and enhance your stats, while Tailoring lets you craft cloth armor that is suitable for your class, including best-in-slot items at certain levels. This combination is particularly useful for maximizing your PvE performance and gearing efficiently.",
  },
];

// see Doc: https://docs.smith.langchain.com/
// Only need to run this function once to create the dataset
export async function createDataset() {
  const dataset = await langsmithClient.createDataset(DATASET_NAME, {
    description:
      "Dataset for evaluating the model's predictions against the reference outputs on a set of questions related to WoW Classic SoD Phase 4.",
  });

  if (!sameLength(inputs, referenceOutputs)) {
    throw new Error(
      `Inputs and reference outputs must have the same length. Inputs: ${inputs.length}, Reference Outputs: ${referenceOutputs.length}`
    );
  }

  await langsmithClient.createExamples({
    inputs,
    outputs: referenceOutputs,
    datasetId: dataset.id,
  });
}

function sameLength(a: unknown, b: unknown): boolean {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length > 0 &&
    a.length === b.length
  );
}
