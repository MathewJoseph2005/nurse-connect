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

// ─── Config ───────────────────────────────────────────────────────────────────

/** Local hour (0-23) at which to send the day-before reminder */
const DAY_BEFORE_HOUR   = 20;   // 8 PM
const DAY_BEFORE_MINUTE = 0;

/** Shift start times (local hour, minute) */
const SHIFT_START = {
  day:   { hour: 6,  minute: 0 },
  night: { hour: 18, minute: 0 },
};

/** How many minutes before shift start to send the "30 min" reminder */
const PRE_SHIFT_MINUTES = 30;

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
  const { year, month, day, hour, minute } = toLocalParts(now);

  // Build today's ISO date string
  const todayISO = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // Build tomorrow's ISO date string
  const tomorrow = new Date(year, month, day + 1);
  const tomorrowISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  // ── 1. Day-before reminders (fired at DAY_BEFORE_HOUR:DAY_BEFORE_MINUTE) ──
  const dayBeforeTarget = new Date(year, month, day, DAY_BEFORE_HOUR, DAY_BEFORE_MINUTE, 0, 0);
  if (withinWindow(now, dayBeforeTarget)) {
    // Find all schedules for tomorrow where the nurse has a user account
    const tomorrowSchedules = await Schedule.find({ duty_date: tomorrowISO })
      .populate({ path: "nurse_id", select: "name user_id", model: "Nurse" })
      .lean();

    for (const sched of tomorrowSchedules) {
      const nurse = sched.nurse_id;
      if (!nurse?.user_id) continue;

      const claimed = await claimReminder(sched._id, "day_before");
      if (!claimed) continue;

      await sendNotification(
        nurse.user_id,
        "⏰ Shift Reminder — Tomorrow",
        `Hi ${nurse.name}, you have a ${shiftLabel(sched.shift_type)} scheduled tomorrow (${tomorrowISO}). Please be ready on time!`,
        "duty_reminder_day_before",
        sched._id
      );
    }
  }

  // ── 2. 30-minute pre-shift reminders ──────────────────────────────────────
  for (const [shiftType, { hour: startHour, minute: startMinute }] of Object.entries(SHIFT_START)) {
    // Calculate the reminder fire time = shift start − PRE_SHIFT_MINUTES
    const fireMinuteOfDay = startHour * 60 + startMinute - PRE_SHIFT_MINUTES;
    const fireHour   = Math.floor(fireMinuteOfDay / 60);
    const fireMinute = fireMinuteOfDay % 60;

    const preShiftTarget = new Date(year, month, day, fireHour, fireMinute, 0, 0);
    if (!withinWindow(now, preShiftTarget)) continue;

    // Find today's schedules for this shift type where nurse has a user account
    const todaySchedules = await Schedule.find({ duty_date: todayISO, shift_type: shiftType })
      .populate({ path: "nurse_id", select: "name user_id", model: "Nurse" })
      .lean();

    for (const sched of todaySchedules) {
      const nurse = sched.nurse_id;
      if (!nurse?.user_id) continue;

      const claimed = await claimReminder(sched._id, "thirty_min");
      if (!claimed) continue;

      await sendNotification(
        nurse.user_id,
        "🏥 Your Shift Starts in 30 Minutes!",
        `${nurse.name}, your ${shiftLabel(sched.shift_type)} starts at ${startHour.toString().padStart(2,"0")}:${startMinute.toString().padStart(2,"0")}. Please head to your station now.`,
        "duty_reminder_30min",
        sched._id
      );
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
  console.log(`   Day-before reminders  → ${DAY_BEFORE_HOUR}:${String(DAY_BEFORE_MINUTE).padStart(2,"0")} local`);
  console.log(`   Day-shift 30-min      → 05:30 local`);
  console.log(`   Night-shift 30-min    → 17:30 local`);

  // Run once immediately on start (catches missed window if server was just restarted)
  tick().catch((err) => console.error("[ReminderScheduler] tick error:", err.message));

  setInterval(() => {
    tick().catch((err) => console.error("[ReminderScheduler] tick error:", err.message));
  }, TICK_MS);
}
