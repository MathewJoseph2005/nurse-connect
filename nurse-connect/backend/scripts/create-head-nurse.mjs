import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, UserRole, HeadNurse } from "../src/models/index.js";

dotenv.config({ path: "./backend/.env" });

const credentials = {
  email: "headnurse.connect@headnurse.local",
  password: "HeadNurse@2026!",
  name: "Head Nurse Connect",
  username: "headnurse_connect",
};

async function connectMongo() {
  const candidates = [process.env.MONGODB_URI, process.env.MONGODB_URI_DIRECT].filter(Boolean);
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
      role: "head_nurse",
      name: credentials.name,
      username: credentials.username,
    });
  } else {
    user.passwordHash = passwordHash;
    user.role = "head_nurse";
    user.name = credentials.name;
    user.username = credentials.username;
    await user.save();
  }

  await UserRole.updateOne(
    { user_id: user._id, role: "head_nurse" },
    { $set: { user_id: user._id, role: "head_nurse" } },
    { upsert: true }
  );

  await HeadNurse.updateOne(
    { user_id: user._id },
    {
      $set: {
        user_id: user._id,
        name: credentials.name,
        username: credentials.username,
        department_id: null,
      },
    },
    { upsert: true }
  );

  console.log(JSON.stringify({ success: true, ...credentials, user_id: user._id.toString() }));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
