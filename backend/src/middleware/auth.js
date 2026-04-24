import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing authorization" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).lean();
    if (!user) return res.status(401).json({ error: "Invalid token" });
    req.authUser = { id: user._id.toString(), role: user.role, email: user.email, name: user.name };
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}
