import mongoose from "mongoose";

const db = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    await mongoose.connect(mongoUri);
    console.log("DB connected");
  } catch (err: unknown) {
    console.log("Database connection error:", err);
    throw err;
  }
};

export default db;