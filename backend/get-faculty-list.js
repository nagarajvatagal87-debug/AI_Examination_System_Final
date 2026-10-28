const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { supabaseAdmin } = require("./config/Supabase");

async function main() {
  console.log("Querying Supabase profiles for faculty...");
  
  // 1. Query for role = 'faculty'
  const { data: facultyUsers } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, department_id, semester, created_at")
    .eq("role", "faculty");

  // Query HODs
  const { data: hodUsers } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, department_id, created_at")
    .eq("role", "hod");

  // Query Principal
  const { data: principalUsers } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, department_id, created_at")
    .eq("role", "principal");

  // 2. Query departments table to resolve department names
  const { data: depts } = await supabaseAdmin
    .from("departments")
    .select("id, name, code");

  const deptMap = {};
  if (depts) {
    depts.forEach(d => {
      deptMap[d.id] = `${d.name} (${d.code || ""})`.trim();
    });
  }

  // Also query all roles distinct to see what roles exist
  const { data: allUsers } = await supabaseAdmin
    .from("profiles")
    .select("role");

  const roleCounts = {};
  if (allUsers) {
    allUsers.forEach(u => {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    });
  }

  console.log("\n=== ROLE COUNTS IN DATABASE ===");
  console.log(JSON.stringify(roleCounts, null, 2));

  console.log(`\n=== TOTAL FACULTY FOUND: ${facultyUsers ? facultyUsers.length : 0} ===`);
  if (facultyUsers && facultyUsers.length > 0) {
    const formatted = facultyUsers.map((f, i) => ({
      index: i + 1,
      name: f.full_name || "N/A",
      email: f.email || "N/A",
      role: f.role,
      department: deptMap[f.department_id] || f.department_id || "Unassigned",
    }));
    console.log(JSON.stringify(formatted, null, 2));
  }

  console.log(`\n=== HEADS OF DEPARTMENT (HODs): ${hodUsers ? hodUsers.length : 0} ===`);
  if (hodUsers && hodUsers.length > 0) {
    const formattedHod = hodUsers.map((h, i) => ({
      index: i + 1,
      name: h.full_name || "N/A",
      email: h.email || "N/A",
      role: h.role,
      department: deptMap[h.department_id] || h.department_id || "Unassigned",
    }));
    console.log(JSON.stringify(formattedHod, null, 2));
  }

  console.log(`\n=== PRINCIPAL: ${principalUsers ? principalUsers.length : 0} ===`);
  if (principalUsers && principalUsers.length > 0) {
    const formattedP = principalUsers.map((p, i) => ({
      index: i + 1,
      name: p.full_name || "N/A",
      email: p.email || "N/A",
      role: p.role,
    }));
    console.log(JSON.stringify(formattedP, null, 2));
  }
}

main().catch(console.error);
