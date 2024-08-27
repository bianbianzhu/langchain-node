import { MemorySaver, StateGraph } from "@langchain/langgraph";
import { graphAnnotation } from "./graph-state";

const workflow = new StateGraph(graphAnnotation);

const checkpointer = new MemorySaver();

const app = workflow.compile({ checkpointer });
