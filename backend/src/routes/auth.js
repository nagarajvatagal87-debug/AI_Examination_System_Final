const express = require("express");
const crypto = require("crypto");
const { supabaseAdmin, supabaseAuth } = require("../../config/Supabase");
const { getUserAvatar, setUserAvatar } = require("../services/avatarStore");

const router = express.Router();
const VALID_ROLES = ["student", "faculty", "hod", "principal", "examdept", "lms"];

// POST /api/auth/register -> Account Activation for Pre-Authorized Users Only
router.post("/register", async (req, res) => {
  try {
    const { email, password, fullName, role, registrationNo } = req.body;

    if (!email || !fullName || !role) {
      return res.status(400).json({ error: "Email, fullName and role are required." });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(", ")}` });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRegNo = registrationNo ? registrationNo.trim() : null;

    // Check if user pre-exists in profiles table
    let userProfile = null;
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role, full_name, registration_no")
      .or(`email.ilike.${cleanEmail}${cleanRegNo ? `,registration_no.ilike.${cleanRegNo}` : ""}`)
      .limit(1);

    if (existing && existing.length > 0) {
      userProfile = existing[0];
    }

    // STRICT CHECK: Reject if user was not pre-registered in institutional database
    if (!userProfile) {
      return res.status(403).json({
        error: "Registration Denied: Record not found in institutional database. Only authorized students, faculty, HOD, principal, and exam department personnel pre-registered by the institution can activate an account."
      });
    }

    // Check role match
    if (userProfile.role !== role) {
      return res.status(403).json({
        error: `Registration Denied: This email or USN is authorized as ${userProfile.role.toUpperCase()}, not as ${role.toUpperCase()}.`
      });
    }

    // Update existing pre-registered profile
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        registration_no: cleanRegNo || userProfile.registration_no,
      })
      .eq("id", userProfile.id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Update or create password in Supabase Auth
    if (password && password.trim()) {
      try {
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          id: userProfile.id,
          email: userProfile.email || cleanEmail,
          password: password.trim(),
          email_confirm: true,
        });

        if (authErr) {
          // If already in auth.users, update password
          await supabaseAdmin.auth.admin.updateUserById(userProfile.id, {
            password: password.trim(),
            email_confirm: true
          });
        }
      } catch (authE) {
        console.warn("Auth password update note:", authE.message);
      }
    }

    return res.status(200).json({
      id: userProfile.id,
      role: userProfile.role,
      fullName: updatedProfile?.full_name || fullName,
      email: userProfile.email,
      message: "Account activated successfully! You can now log in.",
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login -> Real Account Login with Strict Authorization & Password Verification
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email or USN is required." });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: "Password is required." });
    }

    const cleanInput = email.toLowerCase().trim();

    // 1. Query profile by email directly in DB
    let userProfile = null;
    let { data: byEmail, error: errByEmail } = await supabaseAdmin
      .from("profiles")
      .select("*, departments!profiles_department_fk(name)")
      .ilike("email", cleanInput)
      .limit(1);

    if (errByEmail || !byEmail || byEmail.length === 0) {
      const { data: rawEmail } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .ilike("email", cleanInput)
        .limit(1);
      byEmail = rawEmail;
    }

    if (byEmail && byEmail.length > 0) {
      userProfile = byEmail[0];
    }

    // 2. Query profile by registration_no (USN) if not found by email
    if (!userProfile) {
      let { data: byReg, error: errByReg } = await supabaseAdmin
        .from("profiles")
        .select("*, departments!profiles_department_fk(name)")
        .ilike("registration_no", cleanInput)
        .limit(1);

      if (errByReg || !byReg || byReg.length === 0) {
        const { data: rawReg } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .ilike("registration_no", cleanInput)
          .limit(1);
        byReg = rawReg;
      }

      if (byReg && byReg.length > 0) {
        userProfile = byReg[0];
      }
    }

    // Attach department name if not already resolved
    if (userProfile && !userProfile.departments && userProfile.department_id) {
      try {
        const { data: dept } = await supabaseAdmin
          .from("departments")
          .select("name")
          .eq("id", userProfile.department_id)
          .maybeSingle();
        if (dept) {
          userProfile.departments = dept;
        }
      } catch (e) {}
    }

    // 3. STRICT DATABASE AUTHORIZATION: If profile is NOT found in DB, reject immediately!
    if (!userProfile) {
      return res.status(401).json({
        error: "Access Denied: Account not found. Only authorized students, faculty, HOD, principal, and exam department personnel registered in the institutional database can access this portal."
      });
    }

    // 4. STRICT PORTAL ROLE CHECK: Ensure user is logging into their authorized portal
    if (role && userProfile.role !== role) {
      return res.status(403).json({
        error: `Access Denied: Your account is registered as a ${userProfile.role.toUpperCase()}. You cannot log in through the ${role.toUpperCase()} portal. Please switch to the ${userProfile.role.toUpperCase()} tab.`,
        detectedRole: userProfile.role
      });
    }

    // 5. STRICT PASSWORD VERIFICATION via Supabase Auth
    const authEmail = (userProfile.email || "").toLowerCase().trim();
    if (!authEmail) {
      return res.status(401).json({ error: "Account has no registered email. Please contact the administrator." });
    }

    let sessionToken = null;
    const { data: authSignIn, error: signInErr } = await supabaseAuth.auth.signInWithPassword({
      email: authEmail,
      password: password.trim()
    });

    if (!signInErr && authSignIn?.user) {
      sessionToken = authSignIn.session?.access_token || `token-${userProfile.id}`;
    } else {
      return res.status(401).json({
        error: "Invalid credentials: The password you entered is incorrect. Please try again."
      });
    }

    if (userProfile.avatar_url) {
      setUserAvatar(userProfile.id, userProfile.avatar_url);
    }
    const avatarUrl = userProfile.avatar_url || getUserAvatar(userProfile.id) || null;

    return res.json({
      token: sessionToken,
      user: {
        id: userProfile.id,
        role: userProfile.role,
        fullName: userProfile.full_name,
        email: userProfile.email || cleanInput,
        registrationNo: userProfile.registration_no,
        departmentName: userProfile.departments?.name || "Computer Applications",
        avatarUrl: avatarUrl,
        avatar_url: avatarUrl,
      },
    });
  } catch (err) {
    res.status(401).json({ error: err.message || "Invalid credentials" });
  }
});

module.exports = router;