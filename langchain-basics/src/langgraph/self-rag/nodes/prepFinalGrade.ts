import { GraphState } from "../graph-state";

async function prepFinalGrade(state: GraphState): Promise<GraphState> {
  console.log("<---- PREPARE FOR FINAL GRADE ---->");
  return {
    questions: [],
    documents: [...state.documents],
    chatHistory: [],
    count: { rewriteQuery: 0, regenerate: 0 },
    generationGrounded: { ...state.generationGrounded },
    generationUseful: { ...state.generationUseful },
    generations: [],
  };
}

export default prepFinalGrade;
