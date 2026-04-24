import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const bucket = req.params.bucket;
    const requestedPath = req.body.path || "";
    const nestedDir = path.dirname(requestedPath);
    const dir = path.join(uploadsRoot, bucket, nestedDir === "." ? "" : nestedDir);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const requestedPath = req.body.path || "";
    const preferredName = path.basename(requestedPath || file.originalname);
    const safe = preferredName.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, safe);
  },
});

const upload = multer({ storage });

router.post("/:bucket/upload", requireAuth, upload.single("file"), (req, res) => {
  const requestedPath = (req.body.path || req.file.filename).replace(/\\/g, "/");
  const rel = `${req.params.bucket}/${requestedPath}`;
  return res.json({ path: rel, publicUrl: `/api/storage/public/${rel}` });
});

router.get("/public/:bucket/*", (req, res) => {
  const nested = req.params[0] || "";
  const fullPath = path.join(uploadsRoot, req.params.bucket, nested);
  return res.sendFile(fullPath);
});

export default router;
