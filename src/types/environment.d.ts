declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      NODE_ENV?: string;
      MONGO_URI?: string;
      REDIS_DB_HOST?: string;
      REDIS_DB_PORT?: string;
      REDIS_DB_PASS?: string;
    }
  }
}

export {};