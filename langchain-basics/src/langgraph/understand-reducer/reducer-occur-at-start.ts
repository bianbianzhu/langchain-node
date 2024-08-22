import { START, END, StateGraph, MemorySaver } from "@langchain/langgraph";

interface State {
  total: number;
}

function addG(existing: number, updated?: number) {
  return existing + (updated ?? 0);
}

const builderH = new StateGraph<State>({
  channels: {
    total: {
      value: addG,
      default: () => 1, // the default value is 1
    },
  },
})
  .addNode("add_one", (_state) => ({ total: 1 }))
  .addNode("double", (state) => ({ total: state.total }))
  .addEdge(START, "add_one");

function route(state: State) {
  if (state.total < 6) {
    return "double";
  }
  return END;
}

builderH.addConditionalEdges("add_one", route);
builderH.addEdge("double", "add_one");

const memoryH = new MemorySaver();
const graphH = builderH.compile({ checkpointer: memoryH });
const threadId = "some-thread";
const config = { configurable: { thread_id: threadId } };

async function run() {
  // 1st run
  for await (const step of await graphH.stream(
    { total: 2 },
    { ...config, streamMode: "values" }
  )) {
  }

  // 2nd run
  for await (const step of await graphH.stream(
    { total: 1 },
    { ...config, streamMode: "values" }
  )) {
  }

  const history = graphH.getStateHistory(config);
  for await (const snapshot of history) {
    console.log(`====Step ${snapshot.metadata?.step}====`);
    console.log(JSON.stringify(snapshot, null, 2));
  }
}

run();

/** Full log of 1st run
====Step 3====
{
  "values": {
    "total": 9 // >>>>> 2. The state after add_one node writes the state <<<<<
  },
  "next": [], // >>>>> END node does not have any next node <<<<<
  "metadata": {
    "source": "loop",
    "step": 3,
    "writes": {
      "add_one": {
        "total": 1 // >>>>> 1. The add_one node writes the state here <<<<<
      }
    }
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef68-7ce1-6351-8003-b1580a98c442"
    }
  },
  "createdAt": "2024-08-20T13:17:20.517Z"
}
====Step 2====
{
  "values": {
    "total": 8 // >>>>> 2. The state after double node writes the state <<<<<
  },
  "next": [
    "add_one"
  ],
  "metadata": {
    "source": "loop",
    "step": 2,
    "writes": {
      "double": {
        "total": 4 // >>>>> 1. The double node writes the state here <<<<<
      }
    }
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef68-7cdc-6530-8002-5f622cbda0ff"
    }
  },
  "createdAt": "2024-08-20T13:17:20.515Z"
}
====Step 1====
{
  "values": {
    "total": 4 // >>>>> 2. The state `after` add_one node writes the state <<<<<
  },
  "next": [
    "double"
  ],
  "metadata": {
    "source": "loop",
    "step": 1,
    "writes": {
      "add_one": {
        "total": 1 // >>>>> 1. The add_one node writes the state here <<<<<
      }
    }
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef68-7cd9-6e20-8001-b0cbba434bf9"
    }
  },
  "createdAt": "2024-08-20T13:17:20.514Z"
}
====Step 0====
{
  "values": {
    "total": 3 // >>>>> The default value + initial input value <<<<<
  },
  "next": [
    "add_one"
  ],
  "metadata": {
    "source": "loop",
    "step": 0,
    "writes": null // >>>>> The START node DOES NOT write the state inside its own node<<<<<
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef68-7cd0-61e0-8000-7f442cd9d359"
    }
  },
  "createdAt": "2024-08-20T13:17:20.510Z"
}
====Step -1==== >>>>> BEFORE START <<<<<
{
  "values": {
    "total": 1 // >>>>> The default value is already placed here <<<<<
  },
  "next": [
    "__start__"
  ],
  "metadata": {
    "source": "input",
    "step": -1,
    "writes": {
      "__start__": { // >>>>> START node writes the state here (one step before) <<<<< unlike other nodes which writes the state inside their own step + This will go through the `reducer`; HOWEVER, the UPDATE of state occurs in the NEXT NODE, unlike other node, occurs at the same node. <<<<<
        "total": 2
      }
    }
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef68-7cab-67f0-ffff-64119d082a8b"
    }
  },
  "createdAt": "2024-08-20T13:17:20.495Z"
}
*/

//=========================================================================================================

/** full log of 1st and 2nd run
 ====Step 6====
{
  "values": {
    "total": 11
  },
  "next": [],
  "metadata": {
    "source": "loop",
    "step": 6,
    "writes": {
      "add_one": {
        "total": 1
      }
    }
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef7b-4fed-6f71-8006-51c975be0e31"
    }
  },
  "createdAt": "2024-08-20T13:25:45.831Z"
}
====Step 5====
{
  "values": {
    "total": 10 // Default value (the final state from last run: 9) + initial input value (of this run: 1)
  },
  "next": [
    "add_one"
  ],
  "metadata": {
    "source": "loop",
    "step": 5,
    "writes": null // >>>>> The START node DOES NOT write the state inside its own node<<<<<
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef7b-4fe6-6a40-8005-2fecfd6f617b"
    }
  },
  "createdAt": "2024-08-20T13:25:45.828Z"
}
====Step 4==== >>>>> THE OF 2nd RUN - BEFORE START <<<<<
{
  "values": {
    "total": 9 // >>>>> The default value is the FINAL STATE FROM LAST RUN <<<<< 
  },
  "next": [
    "__start__"
  ],
  "metadata": {
    "source": "input",
    "step": 4,
    "writes": {
      "__start__": {
        "total": 1 // >>>>> START node writes the state here (one step before) <<<<< unlike other nodes which writes the state inside their own step + This will go through the `reducer`<<<<<
      }
    }
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef7b-4fe4-6330-8004-e5c5c42fa5fb"
    }
  },
  "createdAt": "2024-08-20T13:25:45.827Z"
}
====Step 3==== >>>>> THE END OF 1st RUN <<<<<
{
  "values": {
    "total": 9
  },
  "next": [],
  "metadata": {
    "source": "loop",
    "step": 3,
    "writes": {
      "add_one": {
        "total": 1
      }
    }
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef7b-448d-65e1-8003-8d528b7c334d"
    }
  },
  "createdAt": "2024-08-20T13:25:44.638Z"
}
====Step 2====
{
  "values": {
    "total": 8
  },
  "next": [
    "add_one"
  ],
  "metadata": {
    "source": "loop",
    "step": 2,
    "writes": {
      "double": {
        "total": 4
      }
    }
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef7b-4488-67c0-8002-8aff0b21c900"
    }
  },
  "createdAt": "2024-08-20T13:25:44.636Z"
}
====Step 1====
{
  "values": {
    "total": 4
  },
  "next": [
    "double"
  ],
  "metadata": {
    "source": "loop",
    "step": 1,
    "writes": {
      "add_one": {
        "total": 1
      }
    }
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef7b-4483-69a0-8001-8411abd6f2e3"
    }
  },
  "createdAt": "2024-08-20T13:25:44.634Z"
}
====Step 0====
{
  "values": {
    "total": 3
  },
  "next": [
    "add_one"
  ],
  "metadata": {
    "source": "loop",
    "step": 0,
    "writes": null
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef7b-447c-6470-8000-2cb189dcaf5f"
    }
  },
  "createdAt": "2024-08-20T13:25:44.631Z"
}
====Step -1====
{
  "values": {
    "total": 1
  },
  "next": [
    "__start__"
  ],
  "metadata": {
    "source": "input",
    "step": -1,
    "writes": {
      "__start__": {
        "total": 2
      }
    }
  },
  "config": {
    "configurable": {
      "thread_id": "some-thread",
      "checkpoint_id": "1ef5ef7b-4457-6a80-ffff-2221f38c7a48"
    }
  },
  "createdAt": "2024-08-20T13:25:44.616Z"
}
 */
