const { supabaseAdmin } = require("../../config/Supabase");

async function getMessagesForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("id, sender_id, recipient_id, body, created_at, profiles!messages_sender_id_fkey(full_name, role)")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

async function sendMessage({ senderId, recipientId, body }) {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({ sender_id: senderId, recipient_id: recipientId, body })
    .select()
    .single();
  if (error) throw error;

  await supabaseAdmin.from("notifications").insert({
    user_id: recipientId,
    title: "New message",
    message: body.slice(0, 100),
  });

  return data;
}

module.exports = { getMessagesForUser, sendMessage };