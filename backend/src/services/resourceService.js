const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const RESOURCES_FILE = path.join(DATA_DIR, "persistent_resources.json");
const memoryResources = [];

// Load persistent academic resources
try {
  if (fs.existsSync(RESOURCES_FILE)) {
    const raw = fs.readFileSync(RESOURCES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryResources.push(...parsed);
    }
    console.log(`Loaded ${memoryResources.length} persistent academic resources from disk.`);
  }
} catch (e) {
  console.warn("Failed to load academic resources file:", e.message);
}

function saveResourcesToDisk() {
  try {
    fs.writeFileSync(RESOURCES_FILE, JSON.stringify(memoryResources, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save academic resources to disk:", e.message);
  }
}

/**
 * Fetch academic resources
 */
async function getAcademicResources({ category, departmentId }) {
  let dbResources = [];
  try {
    let query = supabaseAdmin.from("academic_resources").select("*, departments(name)").order("created_at", { ascending: false });
    if (category) query = query.eq("category", category);
    if (departmentId) query = query.eq("department_id", departmentId);

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      dbResources = data;
    }
  } catch (e) {}

  let list = dbResources.length > 0 ? dbResources : memoryResources;
  if (category) list = list.filter((r) => r.category === category);
  if (departmentId) list = list.filter((r) => !r.department_id || r.department_id === departmentId);

  return list;
}

/**
 * Add an institutional academic resource
 */
async function createAcademicResource(payload, authorId) {
  const newResource = {
    id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    title: payload.title,
    category: payload.category || "Model Question Paper", // "Model Question Paper", "Previous Question Paper", "Academic Document", "Approved Course Resource", "Circular Document"
    department_id: payload.department_id || null,
    subject_code: payload.subject_code || "GEN101",
    description: payload.description || "",
    file_url: payload.file_url || null,
    status: payload.status || "APPROVED",
    created_by: authorId || null,
    created_at: new Date().toISOString(),
  };

  memoryResources.unshift(newResource);
  saveResourcesToDisk();

  try {
    await supabaseAdmin.from("academic_resources").insert(newResource);
  } catch (e) {}

  return newResource;
}

/**
 * Delete academic resource
 */
async function deleteAcademicResource(id) {
  const idx = memoryResources.findIndex((r) => r.id === id);
  if (idx !== -1) {
    memoryResources.splice(idx, 1);
    saveResourcesToDisk();
  }

  try {
    await supabaseAdmin.from("academic_resources").delete().eq("id", id);
  } catch (e) {}

  return true;
}

module.exports = {
  getAcademicResources,
  createAcademicResource,
  deleteAcademicResource,
};
