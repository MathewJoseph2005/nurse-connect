/**
 * scheduling.js — 12-Hour Shift Scheduling Engine
 *
 * Shift definitions:
 *   day   → 06:00 – 18:00  (12 h)
 *   night → 18:00 – 06:00  (12 h)
 *
 * Hard rules enforced (per nurse, per week):
 *   1. ONE shift per day — a nurse may work either "day" or "night" on a
 *      given date, never both.
 *   2. Rest after night shift — a nurse who works "night" on day D cannot
 *      be assigned the "day" slot on day D+1 (they finish at 06:00 and
 *      cannot start again at 06:00 immediately).
 *   3. Max 5 consecutive working days — after 5 days in a row the nurse
 *      must rest (at least 1 day off before working again).
 *   4. Fair acuity rotation — nurses from each division (acuity group) are
 *      round-robin interleaved so every shift has a mix of skill levels.
 *   5. Load balancing — when multiple nurses are eligible, the one with the
 *      fewest shifts so far this week is preferred.
 */

const SHIFTS = ["day", "night"];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Group nurses by their division_id (acuity bucket).
 * Nurses with no division land in "no_division".
 */
export function groupNursesByDivision(nurses) {
  const grouped = {};
  for (const nurse of nurses) {
    const key = nurse.division_id ? nurse.division_id.toString() : "no_division";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(nurse);
  }
  return grouped;
}

/**
 * Round-robin interleave across acuity groups so the resulting list has
 * one nurse from each group per "round":
 *   {A:[1,2,3], B:[4,5], C:[6]} → [1, 4, 6, 2, 5, 3]
 */
export function distributeNursesByDivision(nursesGroupedByDivision) {
  const divisions = Object.keys(nursesGroupedByDivision);
  if (divisions.length === 0) return [];

  const result = [];
  const idx = Object.fromEntries(divisions.map((d) => [d, 0]));
  const maxLen = Math.max(...divisions.map((d) => nursesGroupedByDivision[d].length));

  for (let round = 0; round < maxLen; round++) {
    for (const div of divisions) {
      if (idx[div] < nursesGroupedByDivision[div].length) {
        result.push(nursesGroupedByDivision[div][idx[div]]);
        idx[div]++;
      }
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core scheduler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a balanced 12-hour-shift schedule for one department, one week.
 *
 * @param {object[]} nursesInDept  Active nurses in the department
 * @param {*}        departmentId  Mongoose ObjectId of the department
 * @param {string[]} days          7 ISO date strings ["2024-04-22", …]
 * @param {string[]} _shifts       Ignored — always uses ["day","night"]
 * @param {number}   weekNumber
 * @param {number}   year
 * @param {*}        creatorId     Mongoose ObjectId of the generating user
 * @returns {object[]} Schedule documents ready for Model.insertMany()
 */
export function createBalancedScheduleEntries(
  nursesInDept,
  departmentId,
  days,
  _shifts,      // kept for backward-compat with functions.js call signature
  weekNumber,
  year,
  creatorId
) {
  if (nursesInDept.length === 0) return [];

  // ── Step 1: build a division-interleaved nurse roster ────────────────────
  const byDivision  = groupNursesByDivision(nursesInDept);
  const rosterOrder = distributeNursesByDivision(byDivision); // [n0, n1, …]
  const total       = rosterOrder.length;

  // ── Step 2: initialise per-nurse tracking ────────────────────────────────
  //   shiftsThisWeek : number            — how many shifts assigned so far
  //   workedDates    : Set<string>        — dates already assigned (for rule 1)
  //   lastEntry      : {date,shift}|null  — for night→day rest rule (rule 2)
  //   streak         : number             — consecutive working days (rule 3)
  const track = new Map();
  for (const nurse of rosterOrder) {
    track.set(nurse._id.toString(), {
      shiftsThisWeek: 0,
      workedDates:    new Set(),
      lastEntry:      null,
      streak:         0,
    });
  }

  // ── Step 3: how many nurses per slot? ────────────────────────────────────
  // Target: each nurse works at most 5 days × 1 shift = 5 shifts/week.
  // Total work capacity = total × 5 shifts.
  // Total slots         = 7 days × 2 shifts = 14 slots.
  // Nurses per slot     = capacity / slots (at least 1).
  const nursesPerSlot = Math.max(1, Math.round((total * 5) / (days.length * SHIFTS.length)));

  const entries = [];

  // ── Step 4: assign nurses to every (day, shift) slot ─────────────────────
  for (const day of days) {
    for (const shift of SHIFTS) {
      // Build a sorted candidate list: eligible first, sorted by load
      const candidates = [...rosterOrder].sort((a, b) => {
        const ta = track.get(a._id.toString());
        const tb = track.get(b._id.toString());
        return ta.shiftsThisWeek - tb.shiftsThisWeek; // least loaded first
      });

      let picked = 0;

      for (const nurse of candidates) {
        if (picked >= nursesPerSlot) break;

        const nid = nurse._id.toString();
        const t   = track.get(nid);

        // ── Rule 1: one shift per day ──────────────────────────────────
        if (t.workedDates.has(day)) continue;

        // ── Rule 2: night → cannot do day next morning ─────────────────
        if (t.lastEntry && t.lastEntry.shift === "night" && shift === "day") {
          const lastMs = new Date(t.lastEntry.date + "T00:00:00Z").getTime();
          const thisMs = new Date(day            + "T00:00:00Z").getTime();
          const diffDays = (thisMs - lastMs) / 86_400_000;
          if (diffDays === 1) continue; // enforce rest day
        }

        // ── Rule 3: max 5 consecutive days ─────────────────────────────
        if (t.streak >= 5) continue;

        // ── Nurse is eligible — assign ─────────────────────────────────
        entries.push({
          nurse_id:    nurse._id,
          department_id: departmentId,
          duty_date:   day,
          shift_type:  shift,
          week_number: weekNumber,
          year,
          created_by:  creatorId,
        });

        // Update tracking
        t.shiftsThisWeek++;
        t.workedDates.add(day);

        // Streak: did they work yesterday too?
        const yesterdayMs  = new Date(day + "T00:00:00Z").getTime() - 86_400_000;
        const yesterday    = new Date(yesterdayMs).toISOString().slice(0, 10);
        t.streak = t.workedDates.has(yesterday) ? t.streak + 1 : 1;

        t.lastEntry = { date: day, shift };

        picked++;
      }

      // ── Fallback: if we still have zero nurses for this slot (very small
      //    departments), relax Rule 3 only and try again ──────────────────
      if (picked === 0) {
        for (const nurse of candidates) {
          const nid = nurse._id.toString();
          const t   = track.get(nid);

          if (t.workedDates.has(day)) continue;

          if (t.lastEntry && t.lastEntry.shift === "night" && shift === "day") {
            const lastMs  = new Date(t.lastEntry.date + "T00:00:00Z").getTime();
            const thisMs  = new Date(day              + "T00:00:00Z").getTime();
            if ((thisMs - lastMs) / 86_400_000 === 1) continue;
          }

          // streak rule relaxed — allow assignment
          entries.push({
            nurse_id:    nurse._id,
            department_id: departmentId,
            duty_date:   day,
            shift_type:  shift,
            week_number: weekNumber,
            year,
            created_by:  creatorId,
          });

          t.shiftsThisWeek++;
          t.workedDates.add(day);
          const yesterdayMs = new Date(day + "T00:00:00Z").getTime() - 86_400_000;
          const yesterday   = new Date(yesterdayMs).toISOString().slice(0, 10);
          t.streak = t.workedDates.has(yesterday) ? t.streak + 1 : 1;
          t.lastEntry = { date: day, shift };

          break; // one nurse is enough in extreme fallback
        }
      }
    }
  }

  return entries;
}
