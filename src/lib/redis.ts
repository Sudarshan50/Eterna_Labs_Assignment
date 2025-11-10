import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";

dotenv.config();

export const redisClient: RedisClientType = createClient({
  password: process.env.REDIS_DB_PASS || '',
  socket: {
    host: process.env.REDIS_DB_HOST || 'localhost',
    port: process.env.REDIS_DB_PORT
      ? parseInt(process.env.REDIS_DB_PORT, 10)
      : 16061,
  },
});

redisClient.on("connect", () => {
  console.log("Connected to Redis!");
});

redisClient.on("ready", () => {
  console.log("Redis client ready for commands.");
});

redisClient.on("error", (err: Error) => {
  console.error("Redis Client Error:", err);
});

export async function connectToRedis(): Promise<void> {
  try {
    await redisClient.connect();
    console.log("Successfully connected to Redis");
  } catch (err: unknown) {
    console.error("Error connecting to Redis:", err);
  }
}