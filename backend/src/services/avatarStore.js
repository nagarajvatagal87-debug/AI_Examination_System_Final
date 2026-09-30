const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

const AVATAR_FILE = path.join(DATA_DIR, "persistent_user_avatars.json");
const avatarStore = new Map();

// Load persistent avatars on startup
try {
  if (fs.existsSync(AVATAR_FILE)) {
    const raw = fs.readFileSync(AVATAR_FILE, "utf8");
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([uid, url]) => avatarStore.set(uid, url));
  }
} catch (e) {}

function saveAvatarsToDisk() {
  try {
    const obj = {};
    for (const [uid, url] of avatarStore.entries()) {
      obj[uid] = url;
    }
    fs.writeFileSync(AVATAR_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {}
}

function getUserAvatar(userId) {
  if (!userId) return null;
  return avatarStore.get(userId) || null;
}

function setUserAvatar(userId, url) {
  if (!userId || !url) return;
  avatarStore.set(userId, url);
  saveAvatarsToDisk();
}

module.exports = {
  getUserAvatar,
  setUserAvatar,
  avatarStore,
};
