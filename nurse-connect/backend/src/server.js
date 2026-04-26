import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import dbRoutes from "./routes/db.js";
import functionRoutes from "./routes/functions.js";
import storageRoutes from "./routes/storage.js";
import notificationRoutes from "./routes/notifications.js";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { startReminderScheduler } from "./lib/reminderScheduler.js";

const app = express();
const port = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === "production";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security & Optimization Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for simplicity in multi-service setups
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan(isProd ? "combined" : "dev"));
app.use(compression());

// Rate Limiting (Production Only)
if (isProd) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/", limiter);
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:8080", "http://127.0.0.1:8080"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/functions", functionRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/notifications", notificationRoutes);

// Serve frontend build when available (single-service deployment on Render).
const frontendDistPath = path.resolve(__dirname, "../../dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/api|\/uploads|\/health).*/, (_req, res) => {
    res.sendFile(frontendIndexPath);
  });
}

async function connectMongo() {
  const primaryUri = process.env.MONGODB_URI;
  const directUri = process.env.MONGODB_URI_DIRECT;
  const preferDirect = String(process.env.MONGODB_PREFER_DIRECT || "").toLowerCase() === "true";

  if (!primaryUri) {
    throw new Error("MONGODB_URI is not set in backend/.env");
  }

  const orderedCandidates = preferDirect
    ? [
        { uri: directUri, label: "MONGODB_URI_DIRECT" },
        { uri: primaryUri, label: "MONGODB_URI" },
      ]
    : [
        { uri: primaryUri, label: "MONGODB_URI" },
        { uri: directUri, label: "MONGODB_URI_DIRECT" },
      ];

  const candidates = orderedCandidates.filter((c) => Boolean(c.uri));
  let lastError = null;

  for (let i = 0; i < candidates.length; i += 1) {
    const { uri, label } = candidates[i];

    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      console.log(`MongoDB connected using ${label}`);
      return;
    } catch (error) {
      lastError = error;
      console.error(`MongoDB connection failed using ${label}:`, error?.message || error);

      const isSrvError = String(error?.message || "").includes("querySrv") || String(error?.code || "").includes("ECONNREFUSED");
      if (isSrvError && i === 0 && directUri) {
        console.log("Detected SRV DNS issue. Retrying with direct Mongo URI (MONGODB_URI_DIRECT)...");
      }

      try {
        await mongoose.disconnect();
      } catch {
        // ignore disconnect errors between retries
      }
    }
  }

  throw lastError;
}

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is not set in backend/.env. This is REQUIRED for production auth.");
    } else {
      console.warn("\x1b[33m%s\x1b[0m", "⚠️  WARNING: JWT_SECRET is not set. Using 'dev-secret-key' for local development.");
      process.env.JWT_SECRET = "dev-secret-key";
    }
  }

  await connectMongo();

  const server = app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
    // Start duty-reminder scheduler after server is up and Mongo is connected
    startReminderScheduler();
  });

  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      console.warn(`Port ${port} is already in use. Another backend instance may already be running.`);
      console.warn("Using the existing instance. This dev watcher will stay idle until file changes.");
      mongoose.disconnect().catch(() => {
        // ignore disconnect errors in occupied-port fallback path
      });
      return;
    }

    console.error("Server startup failed", error);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});

// Graceful Shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Closing resources...`);
  try {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
