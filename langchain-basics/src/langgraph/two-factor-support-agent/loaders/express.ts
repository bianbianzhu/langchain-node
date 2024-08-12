import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rootRouter from "../routes";

const PORT = 3018;

function start(): Express {
  const app = express();

  app
    .listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      return;
    })
    .on("error", (error) => {
      console.log(error);
      process.exit(1);
    });

  return app;
}

function loadExpress(): void {
  const app = start();

  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/v1", rootRouter);
}

export default loadExpress;
