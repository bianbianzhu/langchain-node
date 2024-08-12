import { Router } from "express";
import { invokeAgent } from "../controllers/agent";

const router = Router();

router.post("/", invokeAgent);

export default router;
