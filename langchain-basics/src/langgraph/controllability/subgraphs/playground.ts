import {
  Annotation,
  END,
  MemorySaver,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { v4 as uuidV4 } from "uuid";
import { RunnableConfig } from "@langchain/core/runnables";
import { visualization } from "../../visualization";

const TEST_LOGS: Log[] = [
  {
    id: "00001",
    question: "What is the capital of France?",
    answer: "Paris",
    grade: 1,
  },
  {
    id: "00002",
    question: "What is the capital of Germany?",
    answer: "Berlin",
    grade: 1,
  },
  {
    id: "00003",
    question: "What is the capital of Italy?",
    answer: "Rome",
  },
  {
    id: "00004",
    question: "What is the capital of Spain?",
    answer: "Madrad",
    grade: 0,
  },
];

// 1. Define the state for Parent Graph

interface Log {
  id: string; // unique id for each log - value with id is a technique to avoid duplication or conflicts in state regarding subgraphs
  question: string;
  answer: string;
  grade?: number;
  feedback?: string;
}

// Using `unknown` instead of `Record<string, unknown>` to avoid Index signature for type 'string' is missing in type 'Log' (or other defined types)
type Item = unknown & { id?: string };

type ItemWithId<T> = T & { id: string };

function reduceList<T extends Item>(
  x: T[] | T = [],
  y: T[] | T = []
): ItemWithId<T>[] {
  //1.  convert x and y to array if they are not
  const xArray = Array.isArray(x) ? x : [x];
  const yArray = Array.isArray(y) ? y : [y];

  //2.  assign missing ids
  for (const item of xArray) {
    if (item.id === undefined || item.id === null) {
      item.id = uuidV4();
    }
  }
  for (const item of yArray) {
    if (item.id === undefined || item.id === null) {
      item.id = uuidV4();
    }
  }

  //========= From here, we can assert that all items have an id (ItemWithId) =========

  //3. merge two arrays

  // 3.1 create a map object of xArray with id as key and index as value
  // output example:
  //   {
  //     '0ae2ebdb-fe57-4da8-9f7c-b39beebfbe8e': 0,
  //     '1f1f18fe-c835-414b-a06e-05a6608ace6c': 1,
  //     'a80af4aa-04ed-42e7-982b-504b2df97ec4': 2
  //   }
  // This enables us to quickly find the `index` of an item by id
  // Method 1: using reduce
  const xIndexById = (xArray as ItemWithId<T>[]).reduce(
    (accumulator, current, index) => ({
      ...accumulator,
      [current.id]: index,
    }),
    {} as Record<string, number> // Must specify the type of the accumulator, otherwise, the type is `{}`
  );

  // Method 2: using Object.fromEntries
  const xIndexById2 = Object.fromEntries<number>(
    (xArray as ItemWithId<T>[]).map((item, index) => [item.id, index])
  );

  // Method 3: using Map -> This creates a real Map
  //  Map(3) {
  //     '83357b00-7375-480c-8e57-79b1eb083883' => 0,
  //     '03a90ff0-6720-43a2-8749-b9e5e3a61eeb' => 1,
  //     '380ba15b-9a40-464e-898c-c08765d18c07' => 2
  //   }
  const xIndexById3 = new Map(
    (xArray as ItemWithId<T>[]).map((item, index) => [item.id, index])
  );

  // 3.2 create a `merged` array by copying xArray
  const merged = [...(xArray as ItemWithId<T>[])];

  // 3.3 check if the id of each item in yArray exists in `merged` array
  // if exists, update the item in `merged` array with the item in yArray
  // if not exists, add the item in yArray to `merged` array
  //   for (const item of yArray as ItemWithId<T>[]) {
  //     const existingIndex = xIndexById[item.id];
  //     if (existingIndex !== undefined) {
  //       merged[existingIndex] = item;
  //     } else {
  //       // Add the item to the end of the array, so the indexes of the existing items will not be affected
  //       merged.push(item);
  //     }
  //   }

  // Why we don't need to worry about that `merged` array is consistently changing in size? Like new items are added and `existingIndex` can always target the correct item?
  // Because if the id doesn't exist in `merged` array, we add the item to the `end` of the array. So, the indexes of the existing items will not be affected.

  // 3.3.2 Using Map
  for (const item of yArray as ItemWithId<T>[]) {
    const existingIndex = xIndexById3.get(item.id);
    if (existingIndex !== undefined) {
      merged[existingIndex] = item;
    } else {
      merged.push(item);
    }
  }

  return merged;
}

// ====== SubGraph 1: Failure Analysis ======

const failureAnalysisAnnotation = Annotation.Root({
  logs: Annotation<Log[]>({
    default: () => [],
    reducer: reduceList,
  }),
  failureReport: Annotation<string>,
  failures: Annotation<Log[]>,
});

type FailureAnalysisAnnotation = typeof failureAnalysisAnnotation.State;

async function getFailures(
  state: FailureAnalysisAnnotation
): Promise<Pick<FailureAnalysisAnnotation, "failures">> {
  const { logs } = state;
  const failures = logs.filter((log) => log.grade === 0);
  return { failures };
}

async function generateFailureReport(
  state: FailureAnalysisAnnotation
): Promise<Pick<FailureAnalysisAnnotation, "failureReport">> {
  const { failures } = state;
  const failureIdString = failures.map((failure) => failure.id).join(", ");

  const failureReport = `Poor quality of logs with IDs: ${failureIdString}`;

  return { failureReport };
}

const failureAnalysisWorkflow = new StateGraph(failureAnalysisAnnotation);

const failureAnalysisApp = failureAnalysisWorkflow
  .addNode("getFailures", getFailures)
  .addNode("generateFailureReport", generateFailureReport)
  .addEdge(START, "getFailures")
  .addEdge("getFailures", "generateFailureReport")
  .addEdge("generateFailureReport", END)
  .compile();

// (async () => {
//   const config: RunnableConfig = {
//     configurable: {
//       thread_id: "0901",
//     },
//   };

//   const res = await failureAnalysisApp.invoke(
//     { logs: TEST_LOGS } satisfies Partial<FailureAnalysisAnnotation>,
//     config
//   );

//   const history = failureAnalysisApp.getStateHistory(config);

//   for await (const snapshot of history) {
//     console.log(`=======Step ${snapshot.metadata?.step}=======`);
//     console.log(JSON.stringify(snapshot, null, 2));
//   }
// })();

// ====== SubGraph 2: User Input Summarization Annotation ======
const userInputSummarizationAnnotation = Annotation.Root({
  logs: Annotation<Log[]>({
    default: () => [],
    reducer: reduceList,
  }),
  summary: Annotation<string>,
  summaryReport: Annotation<string>,
});

type UserInputSummarizationAnnotation =
  typeof userInputSummarizationAnnotation.State;

async function generateUserInputSummary(
  state: UserInputSummarizationAnnotation
): Promise<Pick<UserInputSummarizationAnnotation, "summary">> {
  const { logs } = state;
  let summary = logs.map((log) => log.question).join(", ");
  summary = "User input is about the usage of Langgraph";
  return { summary };
}

async function sendToSlack(
  state: UserInputSummarizationAnnotation
): Promise<Pick<UserInputSummarizationAnnotation, "summaryReport">> {
  const { summary } = state;
  const summaryReport = `Summary Report: ${summary}`;
  return { summaryReport };
}

const userInputSummarizationWorkflow = new StateGraph(
  userInputSummarizationAnnotation
);

const userInputSummarizationApp = userInputSummarizationWorkflow
  .addNode("generateUserInputSummary", generateUserInputSummary)
  .addNode("sendToSlack", sendToSlack)
  .addEdge(START, "generateUserInputSummary")
  .addEdge("generateUserInputSummary", "sendToSlack")
  .addEdge("sendToSlack", END)
  .compile();

// ====== Parent Graph ======
const parentGraphAnnotation = Annotation.Root({
  rawLogs: Annotation<Log[]>({
    default: () => [],
    reducer: reduceList,
  }),
  logs: Annotation<Log[]>({
    default: () => [],
    reducer: reduceList,
  }), // `logs` will be inherited and used by the subgraphs
  failureReport: Annotation<string>, // `failureReport` will be generated by the Failure Analysis subgraph and propagated back to the parent graph
  summaryReport: Annotation<string>, // `summaryReport` will be generated by the User Input Summarization subgraph and propagated back to the parent graph
});

type ParentGraphAnnotation = typeof parentGraphAnnotation.State;

async function selectLogs(
  state: ParentGraphAnnotation
): Promise<Pick<ParentGraphAnnotation, "logs">> {
  const { rawLogs } = state;
  const logs = rawLogs.filter((log) => log.grade !== undefined);
  return { logs };
}

const workflow = new StateGraph(parentGraphAnnotation);

const checkpointer = new MemorySaver();

const app = workflow
  .addNode("selectLogs", selectLogs)
  .addNode("failureAnalysis", failureAnalysisApp)
  .addNode("userInputSummarization", userInputSummarizationApp)

  .addEdge(START, "selectLogs")
  .addEdge("selectLogs", "failureAnalysis")
  .addEdge("selectLogs", "userInputSummarization")
  .addEdge("failureAnalysis", END)
  .addEdge("userInputSummarization", END)
  .compile({ checkpointer });

visualization(
  "./src/langgraph/controllability/subgraphs/images/playground.png",
  app
);

(async () => {
  const config: RunnableConfig = {
    configurable: {
      thread_id: "0901",
    },
  };

  const res = await app.invoke(
    { rawLogs: TEST_LOGS } as Partial<ParentGraphAnnotation>,
    config
  );

  console.log("final state:", res);

  const history = app.getStateHistory(config);

  for await (const snapshot of history) {
    console.log(`=======Step ${snapshot.metadata?.step}=======`);
    console.log(JSON.stringify(snapshot, null, 2));
  }
})();
