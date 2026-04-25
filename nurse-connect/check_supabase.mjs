import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Read .env from file
const envFile = readFileSync(".env", "utf-8");
const env = {};
envFile.split("\n").forEach(line => {
  const [key, value] = line.split("=");
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase.from('head_nurses').select('*, divisions(name)').limit(1);
  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log("Head nurses columns:", data && data.length > 0 ? Object.keys(data[0]) : "No data");
    console.log(data);
  }
}

check();
