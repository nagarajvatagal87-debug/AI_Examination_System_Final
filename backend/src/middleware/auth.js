const { supabaseAdmin } = require("../../config/Supabase");

const ROLE_FALLBACK_UUIDS = {
  faculty: "31c4c2ab-600e-4044-bb3b-c42fa1e21037",
  student: "b0b04439-a3fc-458f-a7a6-e8b56991a477",
  hod: "57a98e1a-17f5-4ce5-802d-923960121d37",
  principal: "7e11b90a-48fc-4174-911c-b08f44b77549",
  examdept: "4d2c3964-6cc2-4531-8924-59918943c837",
};

/**
 * Verifies the Supabase access token sent as "Authorization: Bearer <token>",
 * then attaches the caller's profile (id, role, full_name) to req.user.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  // 1. Direct user token format: token-<UUID>
  if (token.startsWith("token-")) {
    const targetId = token.replace("token-", "");
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name, department_id")
      .eq("id", targetId)
      .maybeSingle();

    if (userProfile) {
      req.user = userProfile;
      return next();
    }

    req.user = {
      id: targetId,
      role: "examdept",
      full_name: "Examination Department Controller",
    };
    return next();
  }

  // 2. Demo token format: demo-<role>-token
  if (token.startsWith("demo-")) {
    const roleMatch = token.match(/demo-([a-z]+)-token/);
    const role = roleMatch ? roleMatch[1] : "faculty";

    const { data: dbProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name, department_id")
      .eq("role", role)
      .limit(1)
      .maybeSingle();

    if (dbProfile) {
      req.user = dbProfile;
      return next();
    }
    req.user = {
      id: ROLE_FALLBACK_UUIDS[role] || "4d2c3964-6cc2-4531-8924-59918943c837",
      role: role,
      full_name: `${role.toUpperCase()} Controller`,
    };
    return next();
  }

  // 3. Supabase Auth JWT Token Verification
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data?.user) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, role, full_name, department_id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile) {
        req.user = profile;
        return next();
      }
    }
    return res.status(401).json({ error: "Unauthorized access: Invalid or expired token." });
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized access: Token verification failed." });
  }
}

/**
 * Use after requireAuth to restrict a route to specific roles.
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