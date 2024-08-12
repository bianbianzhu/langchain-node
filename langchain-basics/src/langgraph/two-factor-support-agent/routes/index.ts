import { Router } from "express";
import agentRouter from "./agent";

const rootRouter = Router();

rootRouter.use("/two-factor-support-agent", agentRouter);

export default rootRouter;
