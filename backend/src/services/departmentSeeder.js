const { supabaseAdmin } = require("../../config/Supabase");

const DEFAULT_DEPARTMENT_NAMES = [
  "Master of Computer Applications (MCA)",
  "Master of Business Administration (MBA)",
  "Computer Science & Engineering (CSE)",
  "Information Science & Engineering (ISE)",
  "Artificial Intelligence & Machine Learning (AI & ML)",
  "Electronics & Communication Engineering (ECE)",
  "Electrical & Electronics Engineering (EEE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CIVIL)",
  "Bachelor of Computer Applications (BCA)",
  "Computer Science (CS)"
];

async function seedDepartments() {
  try {
    const { data: existing } = await supabaseAdmin.from("departments").select("id, name");
    const existingNames = new Set((existing || []).map((d) => d.name.toLowerCase()));

    const toInsert = [];
    for (const name of DEFAULT_DEPARTMENT_NAMES) {
      if (!existingNames.has(name.toLowerCase())) {
        toInsert.push({ name });
      }
    }

    if (toInsert.length > 0) {
      const { data, error } = await supabaseAdmin.from("departments").insert(toInsert).select();
      if (error) {
        console.warn("Department seeding note:", error.message);
      } else {
        console.log(`Successfully seeded ${data?.length || toInsert.length} new departments into database.`);
      }
    } else {
      console.log("All default departments already exist in database.");
    }
  } catch (err) {
    console.warn("Department seeding skipped:", err.message);
  }
}

module.exports = { seedDepartments };
