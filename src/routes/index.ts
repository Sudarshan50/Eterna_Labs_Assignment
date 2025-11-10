import express from "express";
import { tokenController } from "../controllers/tokenController.js";

const router = express.Router();

// Health check
router.get("/health", tokenController.healthCheck.bind(tokenController));

// Token routes
router.get("/tokens", tokenController.getAllTokens.bind(tokenController));
router.get("/tokens/available", tokenController.getAvailableTokens.bind(tokenController));
router.get("/tokens/:tokenId", tokenController.getTokenById.bind(tokenController));
router.post("/tokens/:tokenId/refresh", tokenController.refreshToken.bind(tokenController));
router.post("/tokens/refresh", tokenController.refreshAllTokens.bind(tokenController));

// Cache management
router.get("/cache/stats", tokenController.getCacheStats.bind(tokenController));
router.delete("/cache", tokenController.clearCache.bind(tokenController));

// Rate limit status
router.get("/rate-limit", tokenController.getRateLimitStatus.bind(tokenController));

// Scheduler management
router.get("/scheduler/status", tokenController.getSchedulerStatus.bind(tokenController));
router.post("/scheduler/trigger", tokenController.triggerUpdate.bind(tokenController));

export default router;