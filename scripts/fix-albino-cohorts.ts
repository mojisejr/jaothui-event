import { createClient } from "next-sanity";
import dayjs from "dayjs";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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
const DRY_RUN = process.env.DRY_RUN !== "false"; // Default to true for safety

/**
 * Logic from getPossibleEvents.ts (Simplified for script)
 */
const parseAgeRanges = (data: string[]) => {
  if (!data || data.length <= 0) return [];
  return data.map((entry, index) => {
    const matches = entry.match(/(\d{1,2}) เดือน(?: ถึง (\d{1,2}) เดือน)?/);
    if (matches) {
      const isGreater = entry.includes("มากกว่า");
      return {
        level: index,
        // If "มากกว่า 12", min becomes 13 to avoid overlap with "10-12"
        min: isGreater ? parseInt(matches[1] ?? "0", 10) + 1 : parseInt(matches[1] ?? "0", 10),
        max: matches[2] ? parseInt(matches[2], 10) : null,
        original: entry,
      };
    }
    return { level: index, min: 99, max: 99, original: entry };
  });
};

const findExactAgeMatch = (age: number, ranges: any[]) => {
  return ranges.find((r) => r.min <= age && (r.max === null || age <= r.max)) || null;
};

async function runMigration() {
  console.log(`🚀 Starting Migration for Event: ${EVENT_ID}`);
  console.log(`Mode: ${DRY_RUN ? "🔍 DRY RUN (No changes will be saved)" : "⚠️ EXECUTION (Changes will be committed)"}`);

  // 1. Fetch Event Metadata
  const eventQuery = `*[_type == "event" && _id == "${EVENT_ID}"][0] {
    title,
    buffaloAgeDeadline,
    "provinceTypes": *[_type=="provinceEventType" && event._ref=="${EVENT_ID}"]{data}[0].data,
    "nationalTypes": *[_type=="nationalEventType" && event._ref=="${EVENT_ID}"]{data}[0].data
  }`;
  const eventData = await client.fetch(eventQuery);

  if (!eventData) {
    console.error("Event not found.");
    return;
  }

  const deadline = eventData.buffaloAgeDeadline;
  const provinceRanges = parseAgeRanges(eventData.provinceTypes || []);
  const nationalRanges = parseAgeRanges(eventData.nationalTypes || []);

  console.log(`📅 Event: ${eventData.title}`);
  console.log(`📅 Deadline: ${deadline}`);

  // 2. Fetch Albino Registrations
  const registrationsQuery = `*[_type == "eventRegister" && event._ref == "${EVENT_ID}" && color == "albino"] {
    _id,
    name,
    birthday,
    buffaloAge,
    type,
    level,
    color
  }`;
  const registrations = await client.fetch(registrationsQuery);

  console.log(`🦬 Found ${registrations.length} albino registrations.`);

  let updateCount = 0;

  for (const reg of registrations) {
    const start = dayjs(reg.birthday);
    const end = dayjs(deadline);
    
    if (!start.isValid()) {
      console.log(`⚠️ Skipping ${reg.name} (ID: ${reg._id}) - Invalid Birthday: ${reg.birthday}`);
      continue;
    }

    // NEW LOGIC: Subtract 1 day for Albino
    const albinoStart = start.subtract(1, "day");
    let newAge = end.diff(albinoStart, "month");
    const remainderDays = end.diff(albinoStart.add(newAge, "month"), "day");
    if (remainderDays > 0) {
      newAge += 1;
    }

    // Re-assign Cohort
    // Priority: Keep current level if possible
    let match = null;
    let newLevel = reg.level;

    if (reg.level === "จังหวัด") {
      match = findExactAgeMatch(newAge, provinceRanges);
    } else if (reg.level === "ประเทศ") {
      match = findExactAgeMatch(newAge, nationalRanges);
    }

    // If no match in current level, try the other one
    if (!match) {
      const pMatch = findExactAgeMatch(newAge, provinceRanges);
      const nMatch = findExactAgeMatch(newAge, nationalRanges);
      if (pMatch) {
        match = pMatch;
        newLevel = "จังหวัด";
      } else if (nMatch) {
        match = nMatch;
        newLevel = "ประเทศ";
      }
    }

    let newType = match ? match.original : reg.type;

    const hasAgeChanged = reg.buffaloAge !== newAge;
    const hasTypeChanged = reg.type !== newType;
    const hasLevelChanged = reg.level !== newLevel;

    if (hasAgeChanged || hasTypeChanged || hasLevelChanged) {
      updateCount++;
      console.log(`\n--------------------------------------------------`);
      console.log(`🦬 Buffalo: ${reg.name} (ID: ${reg._id})`);
      console.log(`   Age:   ${reg.buffaloAge} -> ${newAge} ${hasAgeChanged ? "✅" : ""}`);
      console.log(`   Type:  ${reg.type} -> ${newType} ${hasTypeChanged ? "✅" : ""}`);
      console.log(`   Level: ${reg.level} -> ${newLevel} ${hasLevelChanged ? "✅" : ""}`);

      if (!DRY_RUN) {
        try {
          await client
            .patch(reg._id)
            .set({
              buffaloAge: newAge,
              type: newType,
              level: newLevel,
            })
            .commit();
          console.log(`   ✅ Committed to Sanity`);
        } catch (err) {
          console.error(`   ❌ Failed to update ${reg.name}:`, err);
        }
      }
    }
  }

  console.log(`\n==================================================`);
  console.log(`🏁 Migration Finished.`);
  console.log(`📊 Total Checked: ${registrations.length}`);
  console.log(`📊 Total to Update: ${updateCount}`);
  if (DRY_RUN && updateCount > 0) {
    console.log(`💡 Run with DRY_RUN=false to commit changes.`);
  }
}

runMigration().catch(console.error);
