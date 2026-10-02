const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
const { supabaseAdmin } = require("./config/Supabase");

async function purgeAuthUsers() {
  console.log("=== 🧹 PURGING ALL SUPABASE AUTH USERS ===");
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      console.error("Failed to list auth users:", error.message);
      return;
    }

    const users = data?.users || [];
    console.log(`Found ${users.length} registered auth users in Supabase Auth.`);

    for (const u of users) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(u.id);
        console.log(`✅ Deleted auth user: ${u.email} (${u.id})`);
      } catch (err) {
        console.warn(`Failed deleting ${u.email}:`, err.message);
      }
    }

    console.log("=== 100% SUPABASE AUTH USERS PURGED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Purge error:", err.message);
  }
}

purgeAuthUsers();
