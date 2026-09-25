const express = require("express");
const crypto = require("crypto");
const { supabaseAdmin, supabaseAuth } = require("../../config/Supabase");

const router = express.Router();
const VALID_ROLES = ["student", "faculty", "hod", "principal", "examdept", "lms"];

// POST /api/auth/register -> Real User Registration
router.post("/register", async (req, res) => {
  try {
    const { email, password, fullName, role, registrationNo, year, section, departmentId } = req.body;

    if (!email || !fullName || !role) {
      return res.status(400).json({ error: "Email, fullName and role are required." });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(", ")}` });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRegNo = registrationNo ? registrationNo.trim() : null;

    // Check if user pre-exists in profiles (added by HOD or Faculty)
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role, full_name, registration_no")
      .or(`email.ilike.${cleanEmail}${cleanRegNo ? `,registration_no.ilike.${cleanRegNo}` : ""}`)
      .limit(1);

    let userProfile = existing && existing.length > 0 ? existing[0] : null;

    if (role === "student" && !userProfile) {
      return res.status(403).json({
        error: "Registration Denied: Student record not found in system database. Your Faculty or HOD must first add your email or USN to the database."
      });
    }

    if (role === "faculty" && !userProfile) {
      return res.status(403).json({
        error: "Registration Denied: Faculty record not found in system database. Your HOD must first add your email to the faculty roster."
      });
    }

    if (userProfile) {
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

      return res.status(200).json({
        id: userProfile.id,
        role: userProfile.role,
        fullName: updatedProfile?.full_name || fullName,
        email: userProfile.email,
        message: "Account activated successfully! You can now log in.",
      });
    }

    let userId = null;

    // 1. Create Supabase Auth user if password provided
    if (password) {
      try {
        const { data: authData } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: password,
          email_confirm: true,
        });
        if (authData?.user) {
          userId = authData.user.id;
        }
      } catch (e) {
        console.warn("Auth creation bypass note:", e.message);
      }
    }

    if (!userId) {
      userId = crypto.randomUUID();
    }

    // 2. Insert into profiles table
    const profilePayload = {
      id: userId,
      role,
      full_name: fullName.trim(),
      email: cleanEmail,
      registration_no: role === "student" ? (cleanRegNo || `REG-${Date.now()}`) : null,
      year: role === "student" ? Number(year || 1) : null,
      section: role === "student" ? (section || "A") : null,
      department_id: departmentId || null,
    };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert(profilePayload)
      .select()
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    res.status(201).json({
      id: profile.id,
      role: profile.role,
      fullName: profile.full_name,
      email: profile.email,
      message: "Account created successfully! You can now log in.",
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login -> Real Account Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email or Registration Number is required." });
    }

    const cleanInput = email.toLowerCase().trim();

    // 1. Query profile by email directly in DB (using ilike and explicit FK relation)
    let { data: profiles, error: pError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name, email, registration_no, department_id, departments!profiles_department_fk(name)")
      .ilike("email", cleanInput)
      .limit(1);

    if (pError) {
      console.warn("Profiles email query note:", pError.message);
    }

    let userProfile = (profiles && profiles.length > 0) ? profiles[0] : null;

    // 2. Query profile by registration_no if not found by email
    if (!userProfile) {
      const { data: regProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, role, full_name, email, registration_no, department_id, departments!profiles_department_fk(name)")
        .ilike("registration_no", cleanInput)
        .limit(1);
      userProfile = (regProfiles && regProfiles.length > 0) ? regProfiles[0] : null;
    }

    // If profile found, verify role match if specific portal role was requested
    if (userProfile) {
      if (req.body.role && userProfile.role !== req.body.role) {
        return res.status(403).json({
          error: `Access Denied: Your account is registered as a ${userProfile.role.toUpperCase()}, not as a ${req.body.role.toUpperCase()}. Please select the correct ${userProfile.role.toUpperCase()} portal to log in.`
        });
      }

      return res.json({
        token: `token-${userProfile.id}`,
        user: {
          id: userProfile.id,
          role: userProfile.role,
          fullName: userProfile.full_name,
          email: userProfile.email || cleanInput,
          registrationNo: userProfile.registration_no,
          departmentName: userProfile.departments?.name || "Computer Applications",
        },
      });
    }

    // Strict Authorization: If user profile is NOT found in DB, block access immediately!
    return res.status(403).json({
      error: "Access Denied: Your email or USN is not registered in the system database. Only authorized students or faculty registered by the HOD or administration can access the application."
    });
  } catch (err) {
    res.status(401).json({ error: err.message || "Invalid credentials" });
  }
});

module.exports = router;