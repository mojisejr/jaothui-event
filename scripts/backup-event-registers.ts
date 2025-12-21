import { createClient } from "next-sanity";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.NEXT_PUBLIC_SANITY_TOKEN;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-06-17";

if (!projectId || !dataset || !token) {
  console.error("Missing Sanity environment variables. Please check your .env file.");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token,
});

const EVENT_ID = "44da822e-7ec6-4e82-b530-a2ef06759f24";

async function backupRegisters() {
  console.log(`🚀 Starting Backup for Event: ${EVENT_ID}`);

  // Fetch ALL registrations for this event (not just albino) to be safe
  const query = `*[_type == "eventRegister" && event._ref == "${EVENT_ID}"]`;
  
  try {
    const data = await client.fetch(query);
    console.log(`📦 Found ${data.length} registrations.`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.resolve(__dirname, "../backups");
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const filename = `event-registers-backup-${timestamp}.json`;
    const filePath = path.join(backupDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Backup saved to: ${filePath}`);
    
  } catch (error) {
    console.error("❌ Backup failed:", error);
    process.exit(1);
  }
}

backupRegisters();
