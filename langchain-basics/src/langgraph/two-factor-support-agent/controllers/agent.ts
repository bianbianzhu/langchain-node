import { NextFunction, Request, Response } from "express";
import { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import app from "../app";
import { AuthenticationState, GraphState } from "../graph-state";

const invokeAgentSchema = z.object({
  request: z.object({
    body: z
      .object({
        question: z
          .string()
          .optional()
          .describe("The user question to ask the agent"),
        two_factor_code: z
          .string()
          .regex(/^\d{6}$/)
          .optional()
          .describe("The two factor code"),
      })
      .superRefine((data, ctx) => {
        if (data.question === undefined && data.two_factor_code === undefined) {
          return ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Either question or two_factor_code is required",
            path: ["question", "two_factor_code"],
          });
        }
      }),
    query: z.object({
      thread_id: z.string().uuid().describe("The thread id"),
    }),
  }),
});

export const invokeAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const validateQueryResult =
    invokeAgentSchema.shape.request.shape.query.safeParse(req.query);
  const validationBodyResult =
    invokeAgentSchema.shape.request.shape.body.safeParse(req.body);

  if (!validateQueryResult.success) {
    return res.status(400).json({ error: validateQueryResult.error });
  }

  if (!validationBodyResult.success) {
    return res.status(400).json({ error: validationBodyResult.error });
  }

  const { thread_id } = validateQueryResult.data;
  const { question, two_factor_code } = validationBodyResult.data;

  const config: RunnableConfig = {
    configurable: { thread_id },
    runName: "Customer Support Agent",
  };

  if (thread_id === undefined) {
    return res.status(400).json({ error: "thread_id is required" });
  }

  const isResuming = two_factor_code !== undefined;
  //   if (question === undefined && !isResuming) {
  //     return res.status(400).json({
  //       error:
  //         'You must provide a "question" parameter if you are not resuming a conversation.',
  //     });
  //   }

  if (isResuming) {
    await app.updateState(config, { providedTwoFactorCode: two_factor_code });
  }

  // why passing `null` - does it mean not to invoke the graph app?
  const endState = (await app.invoke(
    isResuming ? null : { messages: new HumanMessage(question ?? "") },
    config
  )) as GraphState;

  if (endState.authenticationState === AuthenticationState.Authorizing) {
    return res.status(200).json({
      instruction: `To confirm it's really you, we've texted you a code. Please re-enter the code here once you receive it. You've had ${endState.authorizationFailureCount} failed attempts.`,
      messages: endState.messages,
      auth_state: endState.authenticationState,
      authorization_failure_count: endState.authorizationFailureCount,
    });
  } else {
    return res.status(200).json({
      messages: endState.messages,
      auth_state: endState.authenticationState,
      authorization_failure_count: endState.authorizationFailureCount,
    });
  }
};
