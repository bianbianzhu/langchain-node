import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

const ParentGraphStateAnnotation = Annotation.Root({
  foo: Annotation<string>,
});

const SubgraphStateAnnotation = Annotation.Root({
  foo: Annotation<string>, // The shared key between the parent and subgraph
  bar: Annotation<string>,
});

type SubgraphState = typeof SubgraphStateAnnotation.State;

async function subgraphNode(
  state: SubgraphState
): Promise<Partial<SubgraphState>> {
  // the subgraph node can communicate with the parent graph via the shared key: foo

  return {
    foo:
      state.foo +
      " " +
      "I am communicating with the parent graph from the subgraph node",
    bar: "This is bar from the subgraph node", // this is subgraph specific
  };
}

const subgraph = new StateGraph(SubgraphStateAnnotation);
const subgraphBuilder = subgraph
  .addNode("subgraphNode", subgraphNode)
  .addEdge(START, "subgraphNode")
  .addEdge("subgraphNode", END);
const subgraphApp = subgraphBuilder.compile();

const parentGraph = new StateGraph(ParentGraphStateAnnotation);
const parentGraphBuilder = parentGraph
  .addNode("subgraph", subgraphApp)
  .addEdge(START, "subgraph")
  .addEdge("subgraph", END);
const parentGraphApp = parentGraphBuilder.compile();

async function main() {
  const res = await parentGraphApp.invoke({ foo: "Hello" });

  console.log(res); // { foo: 'Hello I am communicating with the parent graph from the subgraph node' }
}

main();
