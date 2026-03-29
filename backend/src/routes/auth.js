import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth.js";
import { Admin, Nurse, User, UserRole } from "../models/index.js";

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isStrongEnoughPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function validatePasswordConfirmation(password, confirmPassword) {
  if (password !== confirmPassword) {
    return { valid: false, error: "Passwords do not match" };
  }
  return { valid: true };
}

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/signup", async (req, res) => {
  try {
    const { email, password, confirmPassword, name, phone } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = String(name || "").trim();
    const normalizedPhone = String(phone || "").trim();

    if (!normalizedEmail || !password || !confirmPassword || !normalizedName || !normalizedPhone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const passwordValidation = validatePasswordConfirmation(password, confirmPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Public signup is nurse-only. Admin/head nurse accounts are provisioned by admins.
    const role = "nurse";

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) return res.status(400).json({ error: "User already exists" });

    const nurse = await Nurse.findOne({ phone: normalizedPhone, user_id: null }).lean();
    if (!nurse) {
      return res.status(400).json({ error: "Your phone number was not found in the system. Please contact your Head Nurse to be added first." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: normalizedEmail, passwordHash, role, name: normalizedName, phone: normalizedPhone });
    await UserRole.create({ user_id: user._id, role });

    await Nurse.updateOne({ phone: normalizedPhone, user_id: null }, { $set: { user_id: user._id, name: normalizedName } });

    const token = signToken(user);
    return res.json({
      session: { access_token: token, user: { id: user._id.toString(), email: user.email } },
      user: { id: user._id.toString(), email: user.email }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password || "", user.passwordHash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = signToken(user);
    return res.json({
      session: { access_token: token, user: { id: user._id.toString(), email: user.email } },
      user: { id: user._id.toString(), email: user.email },
      role: user.role,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Login failed" });
  }
});

router.post("/bootstrap-admin", async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(400).json({ error: "Bootstrap is disabled because admin accounts already exist" });
    }

    const { email, password, name, username } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = String(name || "").trim();
    const normalizedUsername = String(username || "").trim();

    if (!email || !password || !name || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const exists = await User.findOne({ email: normalizedEmail }).lean();
    if (exists) return res.status(400).json({ error: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      role: "admin",
      name: normalizedName,
      username: normalizedUsername,
    });

    await UserRole.create({ user_id: user._id, role: "admin" });
    await Admin.create({ user_id: user._id, name: normalizedName, username: normalizedUsername });

    const token = signToken(user);
    return res.json({
      session: { access_token: token, user: { id: user._id.toString(), email: user.email } },
      user: { id: user._id.toString(), email: user.email },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Bootstrap failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.authUser.id).lean();
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const role = await UserRole.findOne({ user_id: user._id }).lean();
  return res.json({ user: { id: user._id.toString(), email: user.email }, role: role?.role || user.role || null });
});

export default router;
