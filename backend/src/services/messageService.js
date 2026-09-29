const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");

const MESSAGES_FILE = path.join(__dirname, "../../persistent_messages.json");
const memoryMessages = [];

// Load persistent messages on startup
try {
  if (fs.existsSync(MESSAGES_FILE)) {
    const raw = fs.readFileSync(MESSAGES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryMessages.push(...parsed);
    }
    console.log(`Loaded ${memoryMessages.length} persistent messaging logs from disk.`);
  }
} catch (e) {
  console.warn("Failed to load messaging file:", e.message);
}

function saveMessagesToDisk() {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(memoryMessages, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save messaging file to disk:", e.message);
  }
}

async function sendMessage({ senderId, receiverId, subject, body, conversationId }) {
  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    sender_id: senderId,
    receiver_id: receiverId,
    subject: subject || "Academic Notification",
    body: body || "",
    conversation_id: conversationId || [senderId, receiverId].sort().join(":"),
    status: "sent",
    read_at: null,
    created_at: new Date().toISOString(),
  };

  memoryMessages.push(newMsg);
  saveMessagesToDisk();

  try {
    await supabaseAdmin.from("messages").insert(newMsg);
  } catch (e) {}

  return newMsg;
}

async function getConversation({ userA, userB }) {
  const convId = [userA, userB].sort().join(":");

  let dbMsgs = [];
  try {
    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("*, sender:sender_id(full_name, email, role), receiver:receiver_id(full_name, email, role)")
      .or(`conversation_id.eq.${convId},and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`)
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      dbMsgs = data;
    }
  } catch (e) {}

  if (dbMsgs.length > 0) {
    return dbMsgs;
  }

  return memoryMessages
    .filter((m) => (m.sender_id === userA && m.receiver_id === userB) || (m.sender_id === userB && m.receiver_id === userA) || m.conversation_id === convId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

async function getUserConversations(userId) {
  let dbMsgs = [];
  try {
    const { data } = await supabaseAdmin
      .from("messages")
      .select("*, sender:sender_id(full_name, email, role), receiver:receiver_id(full_name, email, role)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      dbMsgs = data;
    }
  } catch (e) {}

  const source = dbMsgs.length > 0 ? dbMsgs : memoryMessages.filter((m) => m.sender_id === userId || m.receiver_id === userId);

  // Group by other user ID
  const map = new Map();
  source.forEach((m) => {
    const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    if (!map.has(otherId)) {
      map.set(otherId, m);
    }
  });

  return Array.from(map.values());
}

module.exports = {
  sendMessage,
  getConversation,
  getUserConversations,
};
