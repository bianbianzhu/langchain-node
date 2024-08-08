import { END } from "@langchain/langgraph";
import { GraphNodes } from "../app";
import { GraphState } from "../graph-state";
import { isAIMessage } from "@langchain/core/messages";

function shouldContinue(state: GraphState): GraphNodes.ToolNode | typeof END {
  console.log("**** Select next node ****");
  const { messages } = state;
  const lastMessage = messages.at(-1);

  if (!lastMessage) {
    return GraphNodes.ToolNode;
  }

  if (!isAIMessage(lastMessage)) {
    return GraphNodes.ToolNode;
  }

  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return GraphNodes.ToolNode;
  }

  return END;
}

export default shouldContinue;

/** 
1.	Condition Set 1:
	isAIMessage(lastMessage) is true.
	!lastMessage.tool_calls is true.
	Outcome: Return END.

2.	Condition Set 2:
	isAIMessage(lastMessage) is true.
	lastMessage.tool_calls is an empty array (lastMessage.tool_calls.length === 0).
	Outcome: Return END.

3.	Condition Set 3:
	isAIMessage(lastMessage) is true.
	lastMessage.tool_calls exists and is not an empty array (lastMessage.tool_calls.length > 0).
	Outcome: Return "continue".

4.	Condition Set 4:
	isAIMessage(lastMessage) is false.
	Regardless of the state of lastMessage.tool_calls.
	Outcome: Return "continue".

5.	Condition Set 5:
	messages array is empty (messages.length === 0).
	This will cause lastMessage to be undefined, leading to isAIMessage(lastMessage) being false.
	Outcome: Return "continue".
*/
