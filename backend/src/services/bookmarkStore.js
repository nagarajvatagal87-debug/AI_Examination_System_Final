const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");

const BOOKMARKS_FILE = path.join(__dirname, "../../persistent_bookmarks.json");
const memoryBookmarks = new Map(); // userId -> array of bookmarks

// Load from disk on startup
try {
  if (fs.existsSync(BOOKMARKS_FILE)) {
    const raw = fs.readFileSync(BOOKMARKS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([userId, list]) => {
      memoryBookmarks.set(userId, Array.isArray(list) ? list : []);
    });
    console.log(`Loaded persistent bookmarks for ${memoryBookmarks.size} users.`);
  }
} catch (e) {
  console.warn("Failed to load persistent bookmarks:", e.message);
}

function saveToDisk() {
  try {
    const obj = {};
    for (const [userId, list] of memoryBookmarks.entries()) {
      obj[userId] = list;
    }
    fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save bookmarks to disk:", e.message);
  }
}

async function getUserBookmarks(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("student_bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {}

  return memoryBookmarks.get(userId) || [];
}

async function addBookmark(userId, { subject, title, content, entityType, entityId }) {
  const newBm = {
    id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    subject: subject || "General",
    title: title || "Saved Bookmark",
    content: content || "",
    entity_type: entityType || "note",
    entity_id: entityId || null,
    created_at: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
  };

  const list = memoryBookmarks.get(userId) || [];
  const updated = [newBm, ...list];
  memoryBookmarks.set(userId, updated);
  saveToDisk();

  try {
    await supabaseAdmin.from("student_bookmarks").insert(newBm);
  } catch (e) {}

  return newBm;
}

async function removeBookmark(userId, bookmarkId) {
  const list = memoryBookmarks.get(userId) || [];
  const updated = list.filter((b) => b.id !== bookmarkId);
  memoryBookmarks.set(userId, updated);
  saveToDisk();

  try {
    await supabaseAdmin.from("student_bookmarks").delete().eq("id", bookmarkId).eq("user_id", userId);
  } catch (e) {}

  return { success: true };
}

module.exports = {
  getUserBookmarks,
  addBookmark,
  removeBookmark,
};
