require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

console.log("DEBUG - Supabase URL being used:", supabaseUrl);
console.log("DEBUG - Service key starts with:", serviceRoleKey?.slice(0, 15));

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.warn(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY not set in .env"
  );
}

// Admin client — bypasses RLS. Use for backend reads/writes and creating auth users.
// NEVER expose this key or this client to the frontend.
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

// Auth client — used only to sign users in (and let Supabase issue the JWT).
const supabaseAuth = createClient(supabaseUrl, anonKey);

module.exports = { supabaseAdmin, supabaseAuth };