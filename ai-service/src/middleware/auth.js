const { supabaseAdmin } = require("../../config/Supabase");

/**
 * Verifies the Supabase access token sent as "Authorization: Bearer <token>",
 * then attaches the caller's profile (id, role, full_name) to req.user.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Asks Supabase Auth to verify the token and return the user it belongs to
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", data.user.id)
      .single();
    if (profileError || !profile) {
      return res.status(401).json({ error: "No profile found for this user" });
    }

    req.user = profile; // { id, role, full_name }
    next();
  } catch (err) {
    res.status(401).json({ error: "Authentication failed" });
  }
}

/**
 * Use after requireAuth to restrict a route to specific roles.
 * e.g. router.get("/dashboard", requireAuth, requireRole("student"), handler)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden for this role" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };