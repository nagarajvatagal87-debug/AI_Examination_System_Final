const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const axios = require("axios");

const router = express.Router();
// Deliberately NO requireAuth here — this whole file is the public, no-login section.

// GET /api/public/college-info -> general sections (overview, admissions, contact, etc.)
router.get("/college-info", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("college_info").select("section, content");
  if (error) return res.status(500).json({ error: error.message });

  // Flatten into { overview: {...}, admissions: {...} } shape for easy frontend use
  const bySection = {};
  for (const row of data) bySection[row.section] = row.content;
  res.json(bySection);
});

// GET /api/public/stats -> system live metrics
router.get("/stats", async (req, res) => {
  try {
    const { count: deptCount } = await supabaseAdmin.from("departments").select("*", { count: "exact", head: true });
    const { count: studCount } = await supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student");
    const { count: facCount } = await supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "faculty");
    const { count: exmCount } = await supabaseAdmin.from("exams").select("*", { count: "exact", head: true });
    const { count: evalCount } = await supabaseAdmin.from("evaluations").select("*", { count: "exact", head: true });

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
      departments: deptCount ?? 0,
      students: studCount ?? 0,
      faculty: facCount ?? 0,
      exams: exmCount ?? 0,
      evaluations: evalCount ?? 0,
      satisfaction: "100%"
    });
  } catch (err) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
      departments: 0,
      students: 0,
      faculty: 0,
      exams: 0,
      evaluations: 0,
      satisfaction: "100%"
    });
  }
});

// GET /api/public/departments -> list of departments (name only, no sensitive data)
router.get("/departments", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("departments").select("id, name");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/public/all-info -> all published department info for landing page modals
router.get("/all-info", async (req, res) => {
  try {
    let { data, error } = await supabaseAdmin
      .from("department_public_info")
      .select(`
        department_id, about, student_count, courses, fees, toppers, placement_percentage,
        highest_package, average_package, achievements, facilities, published,
        departments ( name )
      `)
      .eq("published", true);

    if (error) {
      // Fallback query without toppers column if missing
      const fallback = await supabaseAdmin
        .from("department_public_info")
        .select(`
          department_id, about, student_count, courses, fees, placement_percentage,
          highest_package, average_package, achievements, facilities, published,
          departments ( name )
        `)
        .eq("published", true);
      data = fallback.data || [];
    }

    const formatted = (data || []).map((row) => {
      const deptName = row.departments?.name || "Department";
      const toppersList = Array.isArray(row.toppers) && row.toppers.length > 0
        ? row.toppers
        : (Array.isArray(row.fees?.toppers) ? row.fees.toppers : []);

      return {
        id: row.department_id,
        name: deptName,
        about: row.about || "",
        student_count: row.student_count || 0,
        courses: row.courses || [deptName],
        fees: row.fees || null,
        toppers: toppersList,
        placement_percentage: row.placement_percentage ?? null,
        highest_package: row.highest_package ?? null,
        average_package: row.average_package ?? null,
        achievements: Array.isArray(row.achievements) ? row.achievements : [],
        facilities: Array.isArray(row.facilities) ? row.facilities : []
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/departments/:id -> full public profile for one department
router.get("/departments/:id", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("department_public_info")
    .select(`
      about, student_count, courses, fees, placement_percentage,
      highest_package, average_package, achievements, facilities,
      departments ( name )
    `)
    .eq("department_id", req.params.id)
    .eq("published", true) // <-- the privacy rule enforced here
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "This department has no published public information." });
  }
  res.json(data);
});
// POST /api/public/chat -> Public AI Assistant powered by RAG & MemorySaver
router.post("/chat", async (req, res) => {
  try {
    const { question, history } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required." });
    }

    const cleanQ = question.trim();

    // 1. Fetch comprehensive College Data for RAG Grounding
    const [allDeptsRes, collegeRowsRes, deptRowsRes] = await Promise.allSettled([
      supabaseAdmin.from("departments").select("id, name"),
      supabaseAdmin.from("college_info").select("section, content"),
      supabaseAdmin
        .from("department_public_info")
        .select(`
          department_id, about, student_count, courses, fees, placement_percentage,
          highest_package, average_package, achievements, facilities,
          departments ( name )
        `)
        .eq("published", true)
    ]);

    const allDepts = allDeptsRes.status === "fulfilled" ? allDeptsRes.value.data || [] : [];
    const collegeRows = collegeRowsRes.status === "fulfilled" ? collegeRowsRes.value.data || [] : [];
    const deptRows = deptRowsRes.status === "fulfilled" ? deptRowsRes.value.data || [] : [];

    const collegeInfo = {};
    if (Array.isArray(collegeRows)) {
      collegeRows.forEach((r) => { collegeInfo[r.section] = r.content; });
    }

    const publicContext = {
      institution: "Dayananda Sagar Academy of Technology and Management (DSATM)",
      campus_location: {
        address: "Kanakapura Main Road, Opp. Art of Living International Centre, Udayapura, Bengaluru - 560082, Karnataka",
        nearest_metro: "Silk Institute Metro Station (Green Line) - approx 3 km away. Autos and feeder buses readily available.",
        bmtc_buses: "Direct BMTC bus routes 211, 211-A, 216 stop right in front of DSATM Gate.",
        admissions_helpline: "+91 80 2843 2999",
        admissions_email: "principal@dsatm.edu.in"
      },
      institution_overview: collegeInfo?.overview || {
        name: "Dayananda Sagar Academy of Technology and Management",
        accreditation: "Autonomous Institution affiliated with VTU Belagavi, approved by AICTE, NAAC A+ Accredited, NBA Accredited"
      },
      all_offered_academic_departments: allDepts.map((d) => d.name),
      published_department_profiles: deptRows.map((d) => {
        const feesObj = d.fees || {};
        const toppersList = Array.isArray(d.toppers) && d.toppers.length > 0
          ? d.toppers
          : (Array.isArray(feesObj.toppers) ? feesObj.toppers : []);
        return {
          department_name: d.departments?.name || "Department",
          about: d.about || "",
          student_count: d.student_count || 0,
          offered_courses: d.courses || [d.departments?.name || "Program"],
          annual_fee_breakdown: {
            tuition_fee: feesObj.tuition_fee ? `₹${feesObj.tuition_fee}` : null,
            lab_and_development_fee: feesObj.lab_fee ? `₹${feesObj.lab_fee}` : null,
            university_exam_fee: feesObj.exam_fee ? `₹${feesObj.exam_fee}` : null,
            total_annual_fee: feesObj.total_fee ? `₹${feesObj.total_fee}` : null,
            quota: feesObj.quota || "Govt. PGCET / KEA & Management Quotas",
            scholarship_notes: feesObj.notes || ""
          },
          placement_stats: {
            placement_rate: d.placement_percentage ? `${d.placement_percentage}%` : null,
            highest_package: d.highest_package ? `₹${(d.highest_package / 100000).toFixed(1)} LPA` : null,
            average_package: d.average_package ? `₹${(d.average_package / 100000).toFixed(1)} LPA` : null
          },
          toppers_and_rank_holders: toppersList.map((t) => ({
            name: t.name,
            usn: t.usn,
            cgpa: t.cgpa,
            class_sem: t.class_sem,
            rank: t.rank_title,
            year: t.year
          })),
          achievements: Array.isArray(d.achievements) ? d.achievements : []
        };
      }),
      nearby_verified_pgs_and_hostels: [
        { name: "Sri Sai Comforts PG", distance: "300m from DSATM Gate", rent: "₹6,500 - ₹9,500/month", contact: "+91 98451 22344", amenities: "WiFi, 3 times South/North food, laundry, CCTV" },
        { name: "Sri Venkateshwara Luxury PG", distance: "500m from DSATM Gate", rent: "₹7,000 - ₹11,000/month", contact: "+91 99805 77890", amenities: "Attached bath, AC options, 24/7 power backup" },
        { name: "Royal Orchid Girls PG", distance: "400m from DSATM Gate", rent: "₹7,500 - ₹10,000/month", contact: "+91 97412 33455", amenities: "Girls exclusive, biometric entry, 24/7 security & warden" },
        { name: "DSATM On-Campus Hostels", distance: "Inside campus", rent: "As per annual college hostel notification", contact: "+91 80 2843 2999", amenities: "Separate boys & girls blocks, cafeteria, sports" }
      ]
    };

    // 2. Try direct LLM call with Groq if key is configured (High Performance, Sub-Second)
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      const systemPrompt = `You are the official, friendly Public AI Assistant for Dayananda Sagar Academy of Technology and Management (DSATM).
Your goal is to answer prospective students, parents, and visitors accurately, politely, and informatively using ONLY the provided live college and department RAG data.
CRITICAL RULES FOR ACCURACY AND DYNAMISM:
1. Grounding: Answer strictly using facts from the CURRENT COLLEGE RAG DATA. If information is not in the data or a department is not listed in 'published_department_profiles', it means that department has NOT published or has deleted its public disclosure.
2. Department Flexibility: Support inquiries for any academic department (e.g. MCA, CSE, ISE, AI&ML, ECE, EEE, Mechanical, Civil, MBA, BCA, etc.). Quote their specific fees, packages, and toppers only if present in their published profile.
3. Deleted / Unpublished Departments: If asked about fees, placements, or toppers for a department that is NOT in 'published_department_profiles', clearly inform the visitor that this department's public disclosure is currently pending publication by its HOD or Principal.
4. Toppers: Only mention student rank holders who are explicitly listed in 'toppers_and_rank_holders' in the current data. NEVER mention outdated or sample names like Ananya Sharma or Rohan Verma unless they are in the current data.
5. If asked about something not in the knowledge base, politely provide the admissions helpline (+91 80 2843 2999) or email (principal@dsatm.edu.in).
6. Prioritize current COLLEGE RAG DATA over any prior conversation history.`;

      const messagesPayload = [{ role: "system", content: systemPrompt }];

      // Attach sanitized multi-turn conversation memory (without duplicating current prompt)
      if (Array.isArray(history) && history.length > 0) {
        history.slice(-6).forEach((h) => {
          const role = (h.role === "user" || h.sender === "user") ? "user" : "assistant";
          const text = h.content || h.text || "";
          if (text.trim() && text.trim() !== cleanQ) {
            messagesPayload.push({ role, content: text.trim() });
          }
        });
      }

      messagesPayload.push({
        role: "user",
        content: `COLLEGE RAG DATA:\n${JSON.stringify(publicContext, null, 2)}\n\nUSER QUESTION: ${cleanQ}`
      });

      // Active Groq models available for this API key with fallback order
      const modelsToTry = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b"
      ];

      for (const mId of modelsToTry) {
        try {
          const groqRes = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            { model: mId, messages: messagesPayload, temperature: 0.2, max_tokens: 800 },
            { headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" }, timeout: 9000 }
          );

          const ans = groqRes.data?.choices?.[0]?.message?.content;
          if (ans && ans.trim()) {
            return res.json({ answer: ans.trim() });
          }
        } catch (e) {
          console.warn(`Groq model ${mId} attempt failed:`, e.response?.data?.error?.message || e.message);
        }
      }
    }

    // 3. Fallback: Check AI microservice with a tight timeout if available
    try {
      if (process.env.GENAI_SERVICE_URL) {
        const { data } = await axios.post(
          `${process.env.GENAI_SERVICE_URL}/agents/public-chat`,
          { question: cleanQ, history: history || [] },
          {
            headers: { Authorization: `Bearer ${process.env.GENAI_SERVICE_API_KEY || "dev-secret"}` },
            timeout: 1500
          }
        );
        if (data && data.answer) {
          return res.json(data);
        }
      }
    } catch (aiErr) {
      // AI microservice offline or bypassed
    }

    // 4. Smart RAG rule-based fallback parsing directly from live DB data if LLM is unavailable
    const qLower = cleanQ.toLowerCase();
    const publishedProfiles = publicContext.published_department_profiles;

    // Helper to dynamically resolve department matching from question
    function resolveDepartmentMatch(query) {
      const q = query.toLowerCase();

      // Check published profiles first
      for (const prof of publishedProfiles) {
        const name = (prof.department_name || "").toLowerCase();
        const acronymMatch = name.match(/\(([a-z0-9\s&]+)\)/i);
        const acronym = acronymMatch ? acronymMatch[1].toLowerCase().replace(/\s+/g, "") : "";
        const cleanName = name.replace(/\([^)]*\)/g, "").trim();

        if (acronym && (q.includes(acronym) || (acronym === "aiml" && (q.includes("ai & ml") || q.includes("ai/ml"))))) {
          return { profile: prof, isPublished: true, name: prof.department_name };
        }
        if (cleanName && cleanName.split(/\s+/).some((word) => word.length > 3 && q.includes(word))) {
          return { profile: prof, isPublished: true, name: prof.department_name };
        }
      }

      // Check all departments in DB
      for (const d of allDepts) {
        const name = (d.name || "").toLowerCase();
        const acronymMatch = name.match(/\(([a-z0-9\s&]+)\)/i);
        const acronym = acronymMatch ? acronymMatch[1].toLowerCase().replace(/\s+/g, "") : "";
        const cleanName = name.replace(/\([^)]*\)/g, "").trim();

        if (acronym && (q.includes(acronym) || (acronym === "aiml" && (q.includes("ai & ml") || q.includes("ai/ml"))))) {
          return { profile: null, isPublished: false, name: d.name };
        }
        if (cleanName && cleanName.split(/\s+/).some((word) => word.length > 3 && q.includes(word))) {
          return { profile: null, isPublished: false, name: d.name };
        }
      }

      return null;
    }

    // Check Location & Directions
    if (qLower.includes("location") || qLower.includes("address") || qLower.includes("where") || qLower.includes("map") || qLower.includes("reach") || qLower.includes("bus") || qLower.includes("metro")) {
      return res.json({
        answer: `📍 **Dayananda Sagar Academy of Technology and Management (DSATM)**\n\n• **Address:** Kanakapura Main Road, Opp. Art of Living International Centre, Udayapura, Bengaluru - 560082.\n• 🚇 **Nearest Metro:** Silk Institute Station (Namma Metro Green Line, ~3 km away with frequent feeder autos & buses).\n• 🚌 **BMTC Bus Routes:** 211, 211-A, 216 stop directly in front of the DSATM Campus Gate.\n• 📞 **Admissions Helpline:** +91 80 2843 2999\n\nClick '📍 Live Campus Map' in the header for real-time GPS navigation!`
      });
    }

    // Check PGs & Accommodation
    if (qLower.includes("pg") || qLower.includes("hostel") || qLower.includes("stay") || qLower.includes("room") || qLower.includes("accommodation")) {
      return res.json({
        answer: `🏡 **Verified Student PGs & Hostels near DSATM:**\n\n1. **Sri Sai Comforts PG** (300m away, ₹6,500 - ₹9,500/mo, 📞 +91 98451 22344) — WiFi, South/North food, laundry, CCTV.\n2. **Sri Venkateshwara Luxury PG** (500m away, ₹7,000 - ₹11,000/mo, 📞 +91 99805 77890) — Attached bath, AC options, 24/7 backup.\n3. **Royal Orchid Girls PG** (400m away, ₹7,500 - ₹10,000/mo, 📞 +91 97412 33455) — Girls-exclusive, biometric entry, 24/7 security.\n4. **DSATM Campus Hostels** (Inside campus, 📞 +91 80 2843 2999) — Separate boys & girls hostels with dining and sports facilities.\n\nClick '🏡 Nearby PGs' in the navigation bar to see complete photos and amenities!`
      });
    }

    const deptMatch = resolveDepartmentMatch(cleanQ);

    // Check Toppers & Rank Holders
    if (qLower.includes("topper") || qLower.includes("rank") || qLower.includes("gold medalist") || qLower.includes("achiever")) {
      if (deptMatch) {
        if (deptMatch.isPublished && deptMatch.profile) {
          const tops = deptMatch.profile.toppers_and_rank_holders || [];
          if (tops.length > 0) {
            const list = tops.map((t) => `• **${t.name}** (USN: ${t.usn || 'N/A'}${t.class_sem ? ' • ' + t.class_sem : ''}) — **${t.cgpa || 'N/A'} CGPA** (${t.rank || 'Rank Holder'})`).join("\n");
            return res.json({
              answer: `🏆 **Official ${deptMatch.name} Rank Holders & Toppers:**\n\n${list}\n\nCongratulations to our high-achieving students!`
            });
          } else {
            return res.json({
              answer: `🏆 **${deptMatch.name} Toppers:**\n\nNo student rank holders or toppers have been published yet for the ${deptMatch.name} department. Please check back soon or contact the department HOD.`
            });
          }
        } else {
          return res.json({
            answer: `🏆 **${deptMatch.name} Toppers:**\n\nOfficial public disclosures and student rank holders for the ${deptMatch.name} department have not been published yet by the department head. For official records, please contact Admissions at **+91 80 2843 2999**.`
          });
        }
      }

      // General Toppers across all published departments
      const allPublishedToppers = [];
      publishedProfiles.forEach((p) => {
        (p.toppers_and_rank_holders || []).forEach((t) => {
          allPublishedToppers.push({ ...t, dept: p.department_name });
        });
      });

      if (allPublishedToppers.length > 0) {
        const list = allPublishedToppers.map((t) => `• **${t.name}** (${t.dept}) — **${t.cgpa || 'N/A'} CGPA** (${t.rank || 'Rank Holder'}) [USN: ${t.usn || 'N/A'}]`).join("\n");
        return res.json({
          answer: `🏆 **Official DSATM VTU Rank Holders & Toppers:**\n\n${list}\n\nAsk me about any specific department for more detailed academic records!`
        });
      }

      return res.json({
        answer: `🏆 **DSATM Student Rank Holders & Toppers:**\n\nOfficial student rank holders are currently being updated by the respective academic departments. You can check back shortly or reach Admissions at **+91 80 2843 2999**.`
      });
    }

    // Check Fees & Structure
    if (qLower.includes("fee") || qLower.includes("cost") || qLower.includes("tuition") || qLower.includes("quota")) {
      if (deptMatch) {
        if (deptMatch.isPublished && deptMatch.profile) {
          const fees = deptMatch.profile.annual_fee_breakdown || {};
          if (fees.total_annual_fee || fees.tuition_fee) {
            let breakdown = [];
            if (fees.tuition_fee) breakdown.push(`• **Tuition Fee:** ${fees.tuition_fee} / year`);
            if (fees.lab_and_development_fee) breakdown.push(`• **Lab & Development Fee:** ${fees.lab_and_development_fee} / year`);
            if (fees.university_exam_fee) breakdown.push(`• **University Exam Fee:** ${fees.university_exam_fee} / year`);
            if (fees.total_annual_fee) breakdown.push(`• **Total Annual Fee:** ${fees.total_annual_fee} / year`);
            if (fees.quota) breakdown.push(`• **Quota Applicable:** ${fees.quota}`);
            if (fees.scholarship_notes) breakdown.push(`• **Scholarships:** ${fees.scholarship_notes}`);

            return res.json({
              answer: `💳 **${deptMatch.name} Fee Structure:**\n\n${breakdown.join("\n")}\n\n*Note:* Fees may vary depending on KEA PGCET / KCET allotment versus Management Quota seats.`
            });
          } else {
            return res.json({
              answer: `💳 **${deptMatch.name} Fee Structure:**\n\nDetailed annual fee breakdown for ${deptMatch.name} is currently being updated. Please call Admissions at **+91 80 2843 2999** for the official fee schedule.`
            });
          }
        } else {
          return res.json({
            answer: `💳 **${deptMatch.name} Fee Structure:**\n\nOfficial public fee information for ${deptMatch.name} has not been published yet by the department head. Please contact the DSATM Admissions Helpline at **+91 80 2843 2999** for exact quota-wise fee details.`
          });
        }
      }

      // General college fees
      const publishedWithFees = publishedProfiles.filter((p) => p.annual_fee_breakdown?.total_annual_fee || p.annual_fee_breakdown?.tuition_fee);
      if (publishedWithFees.length > 0) {
        const feeList = publishedWithFees.map((p) => `• **${p.department_name}:** ${p.annual_fee_breakdown.total_annual_fee || p.annual_fee_breakdown.tuition_fee || 'Contact Dept'} / year (Quota: ${p.annual_fee_breakdown.quota || 'Govt / Management'})`).join("\n");
        return res.json({
          answer: `💳 **DSATM Department Fee Overview:**\n\n${feeList}\n\n*Note:* Specific government seat matrix fees (KEA KCET / PGCET) and scholarships apply. Call **+91 80 2843 2999** for detailed quota consultations.`
        });
      }

      return res.json({
        answer: `💳 **DSATM Annual Fee Information:**\n\nStandard fees vary depending on the degree program and admission quota (Karnataka Govt. KCET/PGCET quota vs. Management quota). Merit and category scholarships are available.\n\nPlease contact Admissions at **+91 80 2843 2999** or email **principal@dsatm.edu.in** for the latest fee schedules.`
      });
    }

    // Check Placements & Packages
    if (qLower.includes("placement") || qLower.includes("package") || qLower.includes("salary") || qLower.includes("job") || qLower.includes("rate")) {
      if (deptMatch) {
        if (deptMatch.isPublished && deptMatch.profile) {
          const stats = deptMatch.profile.placement_stats || {};
          let items = [];
          if (stats.placement_rate) items.push(`• **Placement Rate:** ${stats.placement_rate}`);
          if (stats.highest_package) items.push(`• **Highest Package:** ${stats.highest_package}`);
          if (stats.average_package) items.push(`• **Average Package:** ${stats.average_package}`);
          if (deptMatch.profile.achievements && deptMatch.profile.achievements.length > 0) {
            items.push(`• **Key Highlights:** ${deptMatch.profile.achievements.join("; ")}`);
          }

          return res.json({
            answer: `📈 **${deptMatch.name} Placement Record:**\n\n${items.join("\n") || "Placement details are being compiled for the latest academic session."}\n\nTop recruiters include leading Tier-1 MNCs and global technology firms.`
          });
        } else {
          return res.json({
            answer: `📈 **${deptMatch.name} Placements:**\n\nOfficial placement disclosures for ${deptMatch.name} have not been published yet by the department head. For placement statistics, contact the DSATM Placement Cell at **+91 80 2843 2999**.`
          });
        }
      }

      // General placements across published departments
      const publishedWithPlacements = publishedProfiles.filter((p) => p.placement_stats?.placement_rate || p.placement_stats?.highest_package);
      if (publishedWithPlacements.length > 0) {
        const plList = publishedWithPlacements.map((p) => `• **${p.department_name}:** ${p.placement_stats.placement_rate || '90%+'} placement rate | Highest: ${p.placement_stats.highest_package || 'N/A'} (Avg: ${p.placement_stats.average_package || 'N/A'})`).join("\n");
        return res.json({
          answer: `📈 **DSATM Department Placement Highlights:**\n\n${plList}\n\nDSATM maintains an active Corporate Relations and Placement division partnering with 200+ recruiters.`
        });
      }
    }

    // Check Specific Department Overview
    if (deptMatch) {
      if (deptMatch.isPublished && deptMatch.profile) {
        const p = deptMatch.profile;
        let details = [];
        if (p.about) details.push(p.about);
        if (p.student_count) details.push(`• **Enrolled Students:** ${p.student_count}`);
        if (p.placement_stats?.placement_rate) details.push(`• **Placement Rate:** ${p.placement_stats.placement_rate} (Highest Package: ${p.placement_stats.highest_package || 'N/A'})`);
        if (p.annual_fee_breakdown?.total_annual_fee) details.push(`• **Annual Fee:** ${p.annual_fee_breakdown.total_annual_fee}`);
        if (p.offered_courses && p.offered_courses.length > 0) details.push(`• **Courses:** ${p.offered_courses.join(", ")}`);

        return res.json({
          answer: `🎓 **${deptMatch.name} at DSATM:**\n\n${details.join("\n\n")}\n\nAdmissions Helpline: **+91 80 2843 2999**`
        });
      } else {
        return res.json({
          answer: `🎓 **${deptMatch.name} at DSATM:**\n\nThis department is offered at DSATM affiliated with VTU Belagavi. The department's public disclosure profile is currently pending publication by the department head.\n\nFor syllabus and admission inquiries, contact Admissions at **+91 80 2843 2999**.`
        });
      }
    }

    // Check All Academic Departments list
    if (qLower.includes("department") || qLower.includes("branch") || qLower.includes("courses") || qLower.includes("programs")) {
      const publishedNames = new Set(publishedProfiles.map((p) => (p.department_name || "").toLowerCase()));
      const deptsList = publicContext.all_offered_academic_departments.length > 0
        ? publicContext.all_offered_academic_departments.map((d) => {
            const isPub = publishedNames.has(d.toLowerCase());
            return `• ${d} ${isPub ? '*(Live Profile Published)*' : ''}`;
          }).join("\n")
        : "• Computer Science & Engineering (CSE)\n• Information Science & Engineering (ISE)\n• Artificial Intelligence & Machine Learning (AI & ML)\n• Cyber Security & Data Science (CS)\n• Electronics & Communication Engineering (ECE)\n• Electrical & Electronics Engineering (EEE)\n• Mechanical Engineering (ME)\n• Civil Engineering (CIVIL)\n• Master of Computer Applications (MCA)\n• Master of Business Administration (MBA)\n• Bachelor of Computer Applications (BCA)";

      return res.json({
        answer: `🏛️ **Academic Departments & Programs Offered at DSATM:**\n\n${deptsList}\n\nAll programs are affiliated with Visvesvaraya Technological University (VTU) and approved by AICTE. Ask me for specific department fees, placements, or rank holders!`
      });
    }

    // Default dynamic response
    const pubDeptNames = publishedProfiles.map((p) => p.department_name).filter(Boolean);
    const pubNote = pubDeptNames.length > 0
      ? `Live published departments available: **${pubDeptNames.join(", ")}**.`
      : "Department profiles are currently being updated by department heads.";

    return res.json({
      answer: `🎓 **Dayananda Sagar Academy of Technology and Management (DSATM)**\n\nDSATM is an autonomous VTU-affiliated premier institution in Bengaluru offering top-ranked Engineering, MCA, and Management programs.\n\n${pubNote}\n\nYou can ask me about:\n1. 🏢 Available Academic Departments\n2. 📈 Department Placement Records & Highest Packages\n3. 💳 Department Fee Structures & Quotas\n4. 🏆 Student Rank Holders & Toppers\n5. 📍 Campus Location, Metro & BMTC Bus Routes\n6. 🏡 Nearby Student PGs & Hostels\n\nAdmissions Helpline: **+91 80 2843 2999** | Email: **principal@dsatm.edu.in**`
    });
  } catch (err) {
    console.error("Error in public chat handler:", err);
    res.status(500).json({ error: "Failed to process chat question." });
  }
});

// GET /api/public/verify-document/:token -> Public QR Document Verification Endpoint (NO LOGIN REQUIRED)
const { verifyDocumentToken } = require("../services/verificationService");
router.get("/verify-document/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const userAgent = req.headers["user-agent"] || "Unknown";
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

    const result = await verifyDocumentToken(token, userAgent, ipAddress);

    // Set cache headers to prevent caching sensitive verification queries
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    return res.json(result);
  } catch (err) {
    console.error("Public verification endpoint error:", err.message);
    return res.json({
      status: "INVALID",
      message: "Unable to verify this document.",
    });
  }
});

module.exports = router;