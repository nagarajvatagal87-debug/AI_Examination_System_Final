/**
 * Institutional Policy Thresholds & Rules Configuration
 * Dayananda Sagar Academy of Technology & Management (DSATM)
 */
const INSTITUTIONAL_POLICY = {
  MIN_ATTENDANCE_PCT: 75.0, // Minimum mandatory attendance required (75%)
  MIN_INTERNAL_MARKS: 25,  // Minimum required internal score out of 50 (25 / 50)
  MAX_INTERNAL_MARKS: 50,  // Maximum internal score cap
  MAIN_EXAM_PASS_MARKS: 40, // Passing marks for main semester end examination (40 / 100)
  MAX_MAIN_MARKS: 100,      // Maximum main examination score
  DEFAULT_UNRECORDED_ATTENDANCE_PCT: 85.0, // Default attendance % assumed when no attendance session shortage recorded
};

function calculateEligibility(attendancePct, avgInternal50, isCondonedByHod = false) {
  const effectiveAttPct = isCondonedByHod ? Math.max(INSTITUTIONAL_POLICY.MIN_ATTENDANCE_PCT, Number(attendancePct) || 0) : Number(attendancePct) || 0;
  const isAttendanceEligible = effectiveAttPct >= INSTITUTIONAL_POLICY.MIN_ATTENDANCE_PCT || isCondonedByHod;
  const isInternalEligible = Number(avgInternal50) >= INSTITUTIONAL_POLICY.MIN_INTERNAL_MARKS;
  const isEligible = isAttendanceEligible && isInternalEligible;

  let eligibilityStatus = "ELIGIBLE";
  if (isCondonedByHod && isInternalEligible) {
    eligibilityStatus = "ELIGIBLE (CONDONED)";
  } else if (!isAttendanceEligible && !isInternalEligible) {
    eligibilityStatus = `DETAINED (Att ${effectiveAttPct}% < 75% & Marks ${avgInternal50}/50 < 25)`;
  } else if (!isAttendanceEligible) {
    eligibilityStatus = `DETAINED (Low Attendance: ${effectiveAttPct}% < 75%)`;
  } else if (!isInternalEligible) {
    eligibilityStatus = `DETAINED (Low Internals: ${avgInternal50}/50 < 25)`;
  }

  return {
    isAttendanceEligible,
    isInternalEligible,
    isEligible,
    eligibilityStatus,
    effectiveAttendancePct: effectiveAttPct,
  };
}

module.exports = {
  INSTITUTIONAL_POLICY,
  calculateEligibility,
};
