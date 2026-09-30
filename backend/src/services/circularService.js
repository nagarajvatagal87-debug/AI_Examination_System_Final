const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");
const { notify } = require("./notification.service");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const CIRCULARS_FILE = path.join(DATA_DIR, "persistent_circulars.json");
const memoryCirculars = [];

// Load persistent circulars from disk
try {
  if (fs.existsSync(CIRCULARS_FILE)) {
    const raw = fs.readFileSync(CIRCULARS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryCirculars.push(...parsed);
    }
    console.log(`Loaded ${memoryCirculars.length} persistent circulars from disk.`);
  }
} catch (e) {
  console.warn("Failed to load circulars file:", e.message);
}

function saveCircularsToDisk() {
  try {
    fs.writeFileSync(CIRCULARS_FILE, JSON.stringify(memoryCirculars, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save circulars to disk:", e.message);
  }
}

/**
 * Get published/all circulars filterable by audience and department
 */
async function getCirculars({ targetAudience, departmentId, status }) {
  let dbCirculars = [];
  try {
    let query = supabaseAdmin
      .from("circulars")
      .select("*, profiles:created_by(full_name)")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      dbCirculars = data;
    }
  } catch (e) {}

  let list = dbCirculars.length > 0 ? dbCirculars : memoryCirculars;

  if (status) {
    list = list.filter((c) => c.status === status);
  }
  if (targetAudience) {
    list = list.filter((c) => c.target_audience === "all" || c.target_audience === targetAudience || targetAudience === "all");
  }
  if (departmentId) {
    list = list.filter((c) => !c.department_id || c.department_id === departmentId);
  }

  return list;
}

/**
 * Create and publish an institutional circular
 */
async function createCircular(payload, authorId) {
  const newCircular = {
    id: `circ-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    title: payload.title,
    description: payload.description || "",
    category: payload.category || "General",
    target_audience: payload.target_audience || "all_staff", // "all_students", "all_faculty", "all_hods", "examdept", "specific_dept"
    department_id: payload.department_id || null,
    publish_date: payload.publish_date || new Date().toISOString().split("T")[0],
    expiry_date: payload.expiry_date || null,
    attachment_url: payload.attachment_url || null,
    status: payload.status || "PUBLISHED",
    created_by: authorId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryCirculars.unshift(newCircular);
  saveCircularsToDisk();

  try {
    await supabaseAdmin.from("circulars").insert(newCircular);
  } catch (e) {}

  // Trigger event-driven notifications if PUBLISHED
  if (newCircular.status === "PUBLISHED") {
    try {
      let targetRole = null;
      if (newCircular.target_audience === "all_students") targetRole = "student";
      else if (newCircular.target_audience === "all_faculty") targetRole = "faculty";
      else if (newCircular.target_audience === "all_hods") targetRole = "hod";
      else if (newCircular.target_audience === "examdept") targetRole = "examdept";

      let query = supabaseAdmin.from("profiles").select("id");
      if (targetRole) query = query.eq("role", targetRole);
      if (newCircular.department_id) query = query.eq("department_id", newCircular.department_id);

      const { data: users } = await query;
      if (users && users.length > 0) {
        for (const u of users) {
          await notify(
            u.id,
            "circular_announcement",
            `📢 Circular: ${newCircular.title}`,
            `${newCircular.description.slice(0, 150)}...\n\nCategory: ${newCircular.category}`
          );
        }
      }
    } catch (err) {
      console.warn("Circular notification dispatch warning:", err.message);
    }
  }

  return newCircular;
}

/**
 * Delete a circular
 */
async function deleteCircular(id) {
  const idx = memoryCirculars.findIndex((c) => c.id === id);
  if (idx !== -1) {
    memoryCirculars.splice(idx, 1);
    saveCircularsToDisk();
  }

  try {
    await supabaseAdmin.from("circulars").delete().eq("id", id);
  } catch (e) {}

  return true;
}

module.exports = {
  getCirculars,
  createCircular,
  deleteCircular,
};
