import dotenv from "dotenv";
import mongoose from "mongoose";
import { HeadNurse, Nurse, Admin } from "../src/models/index.js";

dotenv.config();

const primaryUri = process.env.MONGODB_URI;
const directUri = process.env.MONGODB_URI_DIRECT;
const preferDirect = String(process.env.MONGODB_PREFER_DIRECT || "").toLowerCase() === "true";

const MONGO_URI = preferDirect && directUri ? directUri : primaryUri || "mongodb://localhost:27017/nurse-connect";

async function cleanupIndexes() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Drop problematic indexes
    console.log("\n🧹 Cleaning up indexes...");
    
    try {
      console.log("  Dropping entire admin collection...");
      await Admin.collection.drop();
      console.log("  ✅ Dropped admin collection (all indexes removed)");
    } catch (e) {
      if (e.message.includes("ns not found")) {
        console.log("  ℹ️  Admin collection not found (already dropped)");
      } else {
        throw e;
      }
    }

    try {
      console.log("  Dropping entire head_nurses collection...");
      await HeadNurse.collection.drop();
      console.log("  ✅ Dropped head_nurses collection (all indexes removed)");
    } catch (e) {
      if (e.message.includes("ns not found")) {
        console.log("  ℹ️  HeadNurse collection not found (already dropped)");
      } else {
        throw e;
      }
    }

    try {
      console.log("  Dropping entire nurses collection...");
      await Nurse.collection.drop();
      console.log("  ✅ Dropped nurses collection (all indexes removed)");
    } catch (e) {
      if (e.message.includes("ns not found")) {
        console.log("  ℹ️  Nurse collection not found (already dropped)");
      } else {
        throw e;
      }
    }

    console.log("\n✅ Index cleanup completed!");
    console.log("You can now run: npm run create-test-users");

  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

cleanupIndexes();
