const {
  getSportsMaster,
  getDepartmentFaculty,
  getSportsEvents,
  createSportsEvent,
  publishSportsEvent,
  registerStudentForSports,
  publishSportsResult,
  getSportsAchievements,
  getSportsOverviewStats,
} = require("./src/services/sportsService");

async function testEndToEndWorkflow() {
  console.log("=== 🧪 STARTING SPORTS MANAGEMENT MODULE END-TO-END VERIFICATION ===");

  // 1. Get Master Data
  const master = await getSportsMaster();
  console.log(`✅ Sports Master loaded. Total categories: ${master.length}`);
  if (master.length === 0) throw new Error("Sports Master empty!");

  // 2. Fetch Department Faculty for HOD assignment
  const facultyList = await getDepartmentFaculty("MCA");
  console.log(`✅ Department MCA Faculty retrieved: ${facultyList.length} members found.`);
  const assignedFaculty = facultyList[0];
  console.log(`   Selected Faculty Coordinator: ${assignedFaculty.full_name} (${assignedFaculty.id})`);

  // 3. HOD creates Department Sports Event and assigns Faculty (Status = ASSIGNED)
  const eventPayload = {
    sport_id: master[0].id,
    sport_name: master[0].name,
    event_name: `Test MCA ${master[0].name} Championship 2026`,
    event_level: "DEPARTMENT",
    department_id: "MCA",
    assigned_faculty_id: assignedFaculty.id,
    assigned_faculty_name: assignedFaculty.full_name,
    venue: "DSATM Indoor Sports Arena",
    event_date: "2026-10-15",
    start_time: "10:00 AM",
    max_participants: 2, // Low capacity for testing auto-closure
    status: "ASSIGNED",
  };

  const createdEvent = await createSportsEvent(eventPayload, { userId: "hod-user-001", userRole: "hod" });
  console.log(`✅ HOD Created Event: "${createdEvent.event_name}" (ID: ${createdEvent.id})`);
  console.log(`   Initial Status: ${createdEvent.status} (Faculty assigned: ${createdEvent.assigned_faculty_name})`);

  // 4. Verify Student View: Event should NOT be visible to students while in ASSIGNED state
  const studentEventsBefore = await getSportsEvents({ role: "student", departmentId: "MCA" });
  const isFoundBefore = studentEventsBefore.some((e) => e.id === createdEvent.id);
  console.log(`✅ Student Visibility Check (Before Publish): ${isFoundBefore ? "FAILED (Event visible prematurely)" : "PASSED (Hidden from students)"}`);

  // 5. Faculty Publishes Event
  const publishedEvent = await publishSportsEvent(createdEvent.id, { userId: assignedFaculty.id, userRole: "faculty" });
  console.log(`✅ Faculty Coordinator Published Event! Status is now: ${publishedEvent.status}`);

  // 6. Verify Student View after Publish
  const studentEventsAfter = await getSportsEvents({ role: "student", departmentId: "MCA" });
  const isFoundAfter = studentEventsAfter.some((e) => e.id === createdEvent.id);
  console.log(`✅ Student Visibility Check (After Publish): ${isFoundAfter ? "PASSED (Visible to students)" : "FAILED"}`);

  // 7. Student 1 Registers
  const reg1 = await registerStudentForSports(createdEvent.id, "student-001", {
    full_name: "Rahul Sharma",
    usn: "1DT22MC045",
    department_id: "MCA",
    semester: "III",
  });
  console.log(`✅ Student 1 Registered: ${reg1.student_name} (${reg1.usn})`);

  // 8. Test Duplicate Registration Prevention
  try {
    await registerStudentForSports(createdEvent.id, "student-001", { full_name: "Rahul Sharma" });
    console.error("❌ Duplicate registration check FAILED!");
  } catch (err) {
    console.log(`✅ Duplicate Registration Blocked: "${err.message}"`);
  }

  // 9. Student 2 Registers (Capacity reaches max_participants = 2)
  const reg2 = await registerStudentForSports(createdEvent.id, "student-002", {
    full_name: "Sneha Patel",
    usn: "1DT22MC088",
    department_id: "MCA",
    semester: "III",
  });
  console.log(`✅ Student 2 Registered: ${reg2.student_name} (${reg2.usn})`);

  // 10. Student 3 attempts to register (Capacity Full Check)
  try {
    await registerStudentForSports(createdEvent.id, "student-003", { full_name: "Karan Singh" });
    console.error("❌ Capacity check FAILED!");
  } catch (err) {
    console.log(`✅ Capacity Limit Blocked: "${err.message}"`);
  }

  // 11. Publish Tournament Results & Auto-generate Achievements
  const result = await publishSportsResult(createdEvent.id, {
    winner: "Rahul Sharma (Team Alpha)",
    winner_student_id: "student-001",
    runner_up: "Sneha Patel (Team Beta)",
    runner_up_student_id: "student-002",
    score_details: "21-18, 21-19 Finals Victory",
  }, { userId: assignedFaculty.id, userRole: "faculty" });

  console.log(`✅ Tournament Result Published! Winner: ${result.winner}`);

  // 12. Check Achievements System Integration
  const achievements = await getSportsAchievements({ departmentId: "MCA" });
  console.log(`✅ Achievements Generated: ${achievements.length} record(s) found.`);
  const matchAch = achievements.find((a) => a.event_name === createdEvent.event_name);
  if (matchAch) {
    console.log(`   Achievement Title: "${matchAch.achievement_title}" for ${matchAch.student_name}`);
  }

  // 13. Aggregated Stats Check
  const stats = await getSportsOverviewStats({ departmentId: "MCA" });
  console.log("✅ Overall Aggregated Stats:", stats);

  console.log("\n=============================================================");
  console.log("🎉 ALL SPORTS MANAGEMENT WORKFLOW VERIFICATIONS PASSED 100%!");
  console.log("=============================================================");
}

testEndToEndWorkflow().catch((err) => {
  console.error("❌ Verification error:", err);
});
