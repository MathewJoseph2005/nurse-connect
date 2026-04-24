import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, UserRole, Admin } from "../src/models/index.js";

dotenv.config({ path: "./.env" });

const credentials = {
  email: "admin.caritas@admin.local",
  username: "admin_caritas",
  name: "System Admin",
  password: "CaritasAdmin@2026!",
};

async function connectMongo() {
  const candidates = [process.env.MONGODB_URI_DIRECT, process.env.MONGODB_URI].filter(Boolean);
  let lastError = null;

  for (const uri of candidates) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      return;
    } catch (error) {
      lastError = error;
      try {
        await mongoose.disconnect();
      } catch {
        // ignore
      }
    }
  }

  throw lastError || new Error("No Mongo URI configured");
}

async function main() {
  await connectMongo();

  const passwordHash = await bcrypt.hash(credentials.password, 10);

  let user = await User.findOne({ email: credentials.email });
  if (!user) {
    user = await User.create({
      email: credentials.email,
      passwordHash,
      role: "admin",
      name: credentials.name,
      username: credentials.username,
    });
  } else {
    user.passwordHash = passwordHash;
    user.role = "admin";
    user.name = credentials.name;
    user.username = credentials.username;
    await user.save();
  }

  await UserRole.updateOne(
    { user_id: user._id },
    { $set: { user_id: user._id, role: "admin" } },
    { upsert: true }
  );

  await Admin.updateOne(
    { user_id: user._id },
    { $set: { user_id: user._id, name: credentials.name, username: credentials.username } },
    { upsert: true }
  );

  console.log(JSON.stringify({
    success: true,
    email: credentials.email,
    username: credentials.username,
    password: credentials.password,
    user_id: user._id.toString(),
  }));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message || String(error));
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
