const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

const PROFILE_FILE = path.join(DATA_DIR, "persistent_user_profiles.json");
const profileMap = new Map();

// Load persistent user profiles from disk on startup
try {
  if (fs.existsSync(PROFILE_FILE)) {
    const raw = fs.readFileSync(PROFILE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([uid, profileData]) => {
      if (uid && profileData) profileMap.set(uid, profileData);
    });
    console.log(`Loaded ${profileMap.size} persistent user profiles from disk.`);
  }
} catch (e) {
  console.warn("Failed to load user profiles file:", e.message);
}

function saveProfilesToDisk() {
  try {
    const obj = {};
    for (const [uid, data] of profileMap.entries()) {
      obj[uid] = data;
    }
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save user profiles file:", e.message);
  }
}

function getUserProfileOverride(userId) {
  if (!userId) return null;
  return profileMap.get(userId) || null;
}

function setUserProfileOverride(userId, updates) {
  if (!userId || !updates) return null;
  const existing = profileMap.get(userId) || {};
  const merged = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Standardize property names
  if (updates.fullName || updates.full_name) {
    merged.full_name = updates.fullName || updates.full_name;
    merged.fullName = merged.full_name;
  }
  if (updates.registrationNo || updates.registration_no) {
    merged.registration_no = updates.registrationNo || updates.registration_no;
    merged.registrationNo = merged.registration_no;
  }
  if (updates.avatarUrl || updates.avatar_url) {
    merged.avatar_url = updates.avatarUrl || updates.avatar_url;
    merged.avatarUrl = merged.avatar_url;
  }
  if (updates.gender) merged.gender = updates.gender;
  if (updates.mobile || updates.phone) {
    merged.mobile = updates.mobile || updates.phone;
    merged.phone = merged.mobile;
  }

  profileMap.set(userId, merged);
  saveProfilesToDisk();
  return merged;
}

module.exports = {
  getUserProfileOverride,
  setUserProfileOverride,
  profileMap,
};
