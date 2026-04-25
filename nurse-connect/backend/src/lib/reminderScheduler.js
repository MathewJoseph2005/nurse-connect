/**
 * reminderScheduler.js
 *
 * Runs on a 60-second tick and sends in-app notifications to nurses at:
 *
 *  1. "day_before"  — 20:00 the evening BEFORE the duty day
 *                     "You have a shift tomorrow at <time>."
 *
 *  2. "thirty_min"  — 30 minutes before the shift starts
 *                     Day  shift starts 06:00  → reminder fires at 05:30
 *                     Night shift starts 18:00 → reminder fires at 17:30
 *
 * Shift start times (local, IST-aware via process.env.TZ or Date):
 *   day   → 06:00
 *   night → 18:00
 *
 * De-duplication: a ReminderLog document is inserted (unique index on
 * schedule_id + reminder_type) before inserting the notification.
 * If the insert fails with duplicate-key error we skip silently — this
 * handles server restarts gracefully.
 */

import { Schedule }     from "../models/Schedule.js";
import { Nurse }        from "../models/Nurse.js";
import { Notification } from "../models/Notification.js";
import { ReminderLog }  from "../models/ReminderLog.js";

/** Shift start times (local hour, minute) */
const SHIFT_START = {
  day:   { hour: 6,  minute: 0 },
  night: { hour: 18, minute: 0 },
};

/** Tick interval in ms (1 minute) */
const TICK_MS = 60_000;

/** Window (ms) around the target minute we'll still fire the reminder */
const TOLERANCE_MS = 55_000;  // just under 1 minute so we never double-fire in one window

// ─── Helpers ─────────────────────────────────────────────────────────────────

function localNow() {
  // Returns a Date object representing "now" in local server time.
  return new Date();
}

function toLocalParts(date) {
  return {
    year:    date.getFullYear(),
    month:   date.getMonth(),       // 0-based
    day:     date.getDate(),
    hour:    date.getHours(),
    minute:  date.getMinutes(),
    second:  date.getSeconds(),
  };
}

/**
 * Returns a Date for a specific local time on a specific ISO date string.
 * e.g. localDatetime("2024-04-25", 5, 30)  →  2024-04-25T05:30:00 (local)
 */
function localDatetime(isoDateStr, hour, minute) {
  const [y, m, d] = isoDateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d, hour, minute, 0, 0);
  return dt;
}

/**
 * Is `now` within TOLERANCE_MS of `target`?
 */
function withinWindow(now, target) {
  return Math.abs(now.getTime() - target.getTime()) < TOLERANCE_MS;
}

function shiftLabel(shiftType) {
  return shiftType === "day" ? "Day Shift (6:00 AM)" : "Night Shift (6:00 PM)";
}

// ─── Core reminder sender ─────────────────────────────────────────────────────

/**
 * Try to insert a ReminderLog (unique guard).
 * Returns true if we should proceed (not yet sent), false if already sent.
 */
async function claimReminder(scheduleId, reminderType) {
  try {
    await ReminderLog.create({ schedule_id: scheduleId, reminder_type: reminderType });
    return true;  // we own this reminder
  } catch (err) {
    if (err.code === 11000) return false;  // duplicate key → already sent
    throw err;
  }
}

async function sendNotification(userId, title, message, notificationType, scheduleId) {
  await Notification.create({
    user_id:           userId,
    title,
    message,
    is_read:           false,
    notification_type: notificationType,
    related_id:        scheduleId,
  });
}

// ─── Tick handler ─────────────────────────────────────────────────────────────

async function tick() {
  const now = localNow();
  const { year, month, day } = toLocalParts(now);

  const todayISO = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const tomorrowDt = new Date(year, month, day + 1);
  const tomorrowISO = `${tomorrowDt.getFullYear()}-${String(tomorrowDt.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDt.getDate()).padStart(2, "0")}`;

  const upcomingSchedules = await Schedule.find({ duty_date: { $in: [todayISO, tomorrowISO] } })
    .populate({ path: "nurse_id", select: "name user_id", model: "Nurse" })
    .lean();

  for (const sched of upcomingSchedules) {
    const nurse = sched.nurse_id;
    if (!nurse?.user_id) continue;

    const start = SHIFT_START[sched.shift_type];
    if (!start) continue;

    // Build the exact start Date for this shift
    const [sy, sm, sd] = sched.duty_date.split("-").map(Number);
    const shiftStartDt = new Date(sy, sm - 1, sd, start.hour, start.minute, 0, 0);

    const intervals = [
      { id: "twelve_hours", mins: 12 * 60, title: "⏰ Upcoming Shift (12h)", msg: `Hi ${nurse.name}, you have a ${shiftLabel(sched.shift_type)} starting in 12 hours.` },
      { id: "three_hours", mins: 3 * 60, title: "⏰ Upcoming Shift (3h)", msg: `Hi ${nurse.name}, your ${shiftLabel(sched.shift_type)} starts in exactly 3 hours.` },
      { id: "at_start", mins: 0, title: "🏥 Shift Started", msg: `${nurse.name}, your ${shiftLabel(sched.shift_type)} has just started.` }
    ];

    for (const interval of intervals) {
      const targetDt = new Date(shiftStartDt.getTime() - interval.mins * 60000);
      if (withinWindow(now, targetDt)) {
        const claimed = await claimReminder(sched._id, interval.id);
        if (!claimed) continue;

        await sendNotification(
          nurse.user_id,
          interval.title,
          interval.msg,
          `duty_reminder_${interval.id}`,
          sched._id
        );
      }
    }
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Start the reminder scheduler.
 * Call this once after MongoDB has connected.
 */
export function startReminderScheduler() {
  console.log("⏱  Duty reminder scheduler started (ticking every 60 s)");
  console.log(`   Reminders config     → 12h before, 3h before, exactly at start`);

  // Run once immediately on start (catches missed window if server was just restarted)
  tick().catch((err) => console.error("[ReminderScheduler] tick error:", err.message));

  setInterval(() => {
    tick().catch((err) => console.error("[ReminderScheduler] tick error:", err.message));
  }, TICK_MS);
}
