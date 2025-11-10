import express from "express";
import { createServer } from "http";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import {
  globalErrorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";
import { successResponse } from "./lib/responseUtils.js";
import db from "./lib/db.js";
import { connectToRedis } from "./lib/redis.js";
import router from "./routes/index.js";

dotenv.config();

const app = express();
const server = createServer(app);
const PORT: number = parseInt(process.env.PORT || '3000', 10);

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req: express.Request, res: express.Response) => {
  successResponse(res, null, "The service is healthy and running!");
});

app.use("/api", router);

app.use(notFoundHandler);
app.use(globalErrorHandler);

db()
  .then(() => {
    connectToRedis().catch((err: Error) => {
      console.error("Failed to connect to Redis", err);
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((err: Error) => {
    console.error("Failed to connect to the database", err);
    process.exit(1);
  });

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  process.exit(0);
});