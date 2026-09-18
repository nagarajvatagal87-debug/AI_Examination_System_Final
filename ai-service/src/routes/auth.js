const express = require("express");
const { supabaseAdmin, supabaseAuth } = require("../../config/Supabase");

const router = express.Router();

// POST /api/auth/register
// body: { email, password, fullName, role, registrationNo?, year?, section?, departmentId? }
router.post("/register", async (req, res) => {
  try {
    const { email, password, fullName, role, registrationNo, year, section, departmentId } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: "email, password, fullName and role are required" });
    }

    // 1. Create the actual auth user (Supabase handles password hashing/storage)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification for now during dev
    });
    if (authError) throw authError;

    // 2. Create the matching profile row with role-specific fields
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        role,
        full_name: fullName,
        email,
        registration_no: role === "student" ? registrationNo : null,
        year: role === "student" ? year : null,
        section: role === "student" ? section : null,
        department_id: departmentId || null,
      })
      .select()
      .single();

    if (profileError) {
      // roll back the auth user if the profile insert failed, so we don't get orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    res.status(201).json({ id: profile.id, role: profile.role, fullName: profile.full_name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login
// body: { email, password }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    // Supabase Auth verifies the password and issues a real access token (JWT)
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Fetch the profile so the frontend knows the role immediately
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", data.user.id)
      .single();
    if (profileError) throw profileError;

    res.json({
      token: data.session.access_token,
      user: { id: profile.id, role: profile.role, fullName: profile.full_name },
    });
  } catch (err) {
    res.status(401).json({ error: err.message || "Invalid credentials" });
  }
});

module.exports = router;