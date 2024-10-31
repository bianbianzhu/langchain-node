import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

const ParentGraphStateAnnotation = Annotation.Root({
  foo: Annotation<string>,
});

const SubgraphStateAnnotation = Annotation.Root({
  // NONE of these keys are shared between the parent and subgraph
  baz: Annotation<string>,
  bar: Annotation<string>,
});

type SubgraphState = typeof SubgraphStateAnnotation.State;
type ParentGraphState = typeof ParentGraphStateAnnotation.State;

async function subgraphNode(
  state: SubgraphState
): Promise<Partial<SubgraphState>> {
  return {
    baz:
      state.baz +
      " " +
      "I am communicating with the parent graph from the subgraph node but via a function", // this is subgraph specific
    bar: "This is bar from the subgraph node", // this is subgraph specific
  };
}

const subgraph = new StateGraph(SubgraphStateAnnotation);
const subgraphBuilder = subgraph
  .addNode("subgraphNode", subgraphNode)
  .addEdge(START, "subgraphNode")
  .addEdge("subgraphNode", END);
const subgraphApp = subgraphBuilder.compile();

async function subgraphWrapperNode(
  state: ParentGraphState
): Promise<Partial<ParentGraphState>> {
  const response = await subgraphApp.invoke({ baz: state.foo });

  return {
    foo: response.baz,
  };
}

const parentGraph = new StateGraph(ParentGraphStateAnnotation);
const parentGraphBuilder = parentGraph
  .addNode("subgraph", subgraphWrapperNode)
  .addEdge(START, "subgraph")
  .addEdge("subgraph", END);
const parentGraphApp = parentGraphBuilder.compile();

async function main() {
  const res = await parentGraphApp.invoke({ foo: "Hello" });

  console.log(res); // { foo: 'Hello I am communicating with the parent graph from the subgraph node' }
}

main();
