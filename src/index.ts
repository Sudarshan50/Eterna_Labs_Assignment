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
import { webSocketService } from "./lib/websocketService.js";
import { schedulerService } from "./lib/schedulerService.js";
import { csvParser } from "./lib/csvParser.js";

dotenv.config();

const app = express();
const server = createServer(app);
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req: express.Request, res: express.Response) => {
  successResponse(res, null, "Real-time Meme Coin Aggregation Service is running! 🚀");
});

app.use("/api", router);

app.use(notFoundHandler);
app.use(globalErrorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Connect to database
    await db();
    console.log("✅ Database connected");

    // Connect to Redis
    await connectToRedis();
    console.log("✅ Redis connected");

    // Load token data from CSV
    await csvParser.loadTokens('p1.csv');
    console.log("✅ Token data loaded from CSV");

    // Initialize WebSocket service
    webSocketService.initialize(server);
    console.log("✅ WebSocket service initialized");

    // Start scheduler (default 120 seconds = 2 minutes for better rate limit management)
    const updateInterval = parseInt(process.env.UPDATE_INTERVAL || '120', 10);
    schedulerService.start(updateInterval);

    // Start server
    server.listen(PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📡 WebSocket available at ws://localhost:${PORT}`);
      console.log(`🔄 Auto-refresh every ${updateInterval} seconds`);
      console.log(`💾 Cache TTL: 5 minutes (300s) for fault tolerance`);
      console.log(`⚙️  Environment: ${process.env.NODE_ENV || "development"}\n`);
    });
  } catch (err) {
    console.error("❌ Failed to initialize services:", err);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  console.log("\n🛑 Shutting down gracefully...");

  // Stop scheduler
  schedulerService.stop();
  console.log("✅ Scheduler stopped");

  // Close WebSocket
  webSocketService.close();
  console.log("✅ WebSocket closed");

  // Close server
  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error("⚠️ Forcing shutdown...");
    process.exit(1);
  }, 10000);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Start the application
initializeServices();