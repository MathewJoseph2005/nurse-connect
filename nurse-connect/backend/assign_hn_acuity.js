import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import { HeadNurse } from "./src/models/HeadNurse.js";
import { Division } from "./src/models/Division.js";

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DIRECT || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nurseconnect");
    
    const divisions = await Division.find({});
    if (divisions.length === 0) {
      console.log("No divisions found.");
      process.exit(0);
    }
    
    const headNurses = await HeadNurse.find({ $or: [{ division_id: null }, { division_id: { $exists: false } }] });
    console.log(`Found ${headNurses.length} head nurses without Acuity.`);
    
    for (let i = 0; i < headNurses.length; i++) {
      const hn = headNurses[i];
      // Pick a division cyclically or randomly. Let's do cyclically
      const div = divisions[i % divisions.length];
      hn.division_id = div._id;
      await hn.save();
      console.log(`Assigned Acuity '${div.name}' to Head Nurse '${hn.name}'`);
    }
    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
