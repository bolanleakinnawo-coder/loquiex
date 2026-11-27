// Streak reminder job. Runs every 15 minutes inside the server and can also
// be triggered from outside (POST /api/push/run-reminders) by a free cron
// service, which also keeps a sleeping Render instance awake.
//
// Every time below is the member's own local time:
//   keep      19:00  streak going, not practised yet today
//   restore   09:00  grace day starts (missed yesterday), with time left
//             20:00  last call on the grace day, with time left
//   comeback  18:00  every day until they practise again (round 22)
//   first     18:00  on sign-up day (if they joined over an hour ago) and
//                    1, 3 and 7 days after joining, until the first practice
// Each reminder goes out at most once per local day.
const User = require("../MODELS/User");
const Recording = require("../MODELS/Recording");
const AppSetting = require("../MODELS/AppSetting");
const {
  getStreakStatus,
  zonedParts,
  localDayNumber,
} = require("../utils/streak");
const { noticeKindFor, pushPayloadFor } = require("./streakNotices");
const { pushReady, sendPushToUser } = require("./push");
const { emitToUser } = require("./realtime");

const RUN_EVERY_MS = 15 * 60 * 1000;
// A slot stays open for a few hours so a restart or a sleeping server
// doesn't make anyone miss the day's reminder.
const SLOT_HOURS = 3;

const FIRST_STREAK_DAYS = [0, 1, 3, 7];

function inSlot(hour, start) {
  return hour >= start && hour < Math.min(24, start + SLOT_HOURS);
}

// Which reminder (if any) is due for this member right now.
function dueReminder(user, status, now) {
  const kind = noticeKindFor(status, user.notificationPrefs || {});
  if (!kind) return null;
  const { hour } = zonedParts(now, status.timeZone);

  if (kind === "keep" && inSlot(hour, 19)) return { kind, slot: "keep" };

  if (kind === "restore") {
    if (inSlot(hour, 20)) return { kind, slot: "restore-pm" };
    if (inSlot(hour, 9)) return { kind, slot: "restore-am" };
    return null;
  }

  // Round 22 (Sheriff): members who stopped practising get the come-back
  // reminder every day at 18:00 until they practise again.
  if (kind === "comeback" && inSlot(hour, 18)) return { kind, slot: "comeback" };

  if (kind === "first" && inSlot(hour, 18)) {
    const joinedDay = localDayNumber(user.createdAt, status.timeZone);
    const daysSinceJoin = localDayNumber(now, status.timeZone) - joinedDay;
    const joinedOverAnHourAgo = now - new Date(user.createdAt) > 60 * 60 * 1000;
    if (FIRST_STREAK_DAYS.includes(daysSinceJoin) && joinedOverAnHourAgo) {
      return { kind, slot: "first" };
    }
  }
  return null;
}

// Claims the reminder for today in one atomic write, so two server
// instances (or a cron call during a scheduled run) never send it twice.
async function claim(userId, slot, today) {
  const field = `reminderLog.${slot}`;
  const result = await User.updateOne(
    { _id: userId, [field]: { $ne: today } },
    { $set: { [field]: today } },
  );
  return result.modifiedCount === 1;
}

// Round 14 (Sheriff): automatic streak reminders were turned off.
// Round 22 (Sheriff): the admin switches them on or off in
// Admin > Notifications. Until the switch is used, AUTO_STREAK_REMINDERS=on
// on Render still turns them on.
const AUTO_KEY = "autoStreakReminders";

async function autoRemindersOn() {
  const row = await AppSetting.findOne({ key: AUTO_KEY }).lean();
  if (row && typeof row.value === "boolean") return row.value;
  return String(process.env.AUTO_STREAK_REMINDERS || "").toLowerCase() === "on";
}

// Round 23 (Sheriff): the admin's own wording for each reminder.
const TEXT_KEY = "streakReminderText";
const { PUSH_DEFAULTS } = require("./streakNotices");

async function reminderTexts() {
  const row = await AppSetting.findOne({ key: TEXT_KEY }).lean();
  const saved = row && typeof row.value === "object" && row.value ? row.value : {};
  return Object.fromEntries(
    Object.entries(PUSH_DEFAULTS).map(([kind, d]) => [
      kind,
      {
        label: d.label,
        title: saved[kind]?.title || d.title,
        body: saved[kind]?.body || d.body,
      },
    ]),
  );
}

async function saveReminderText(kind, { title, body }) {
  if (!PUSH_DEFAULTS[kind]) return null;
  const row = await AppSetting.findOne({ key: TEXT_KEY }).lean();
  const value = { ...(row?.value || {}) };
  value[kind] = {
    title: String(title || "").trim().slice(0, 200),
    body: String(body || "").trim().slice(0, 500),
  };
  await AppSetting.updateOne({ key: TEXT_KEY }, { $set: { value } }, { upsert: true });
  return reminderTexts();
}

async function setAutoReminders(on) {
  await AppSetting.updateOne({ key: AUTO_KEY }, { $set: { value: Boolean(on) } }, { upsert: true });
  return autoRemindersOn();
}

async function runReminders(now = new Date()) {
  if (!(await autoRemindersOn())) {
    return { checked: 0, sent: 0, off: true };
  }
  if (!pushReady()) return { checked: 0, sent: 0 };
  const texts = await reminderTexts();
  let checked = 0;
  let sent = 0;

  const cursor = User.find({ "pushSubscriptions.0": { $exists: true } })
    .select(
      "timeZone notificationPrefs pushSubscriptions reminderLog createdAt",
    )
    .cursor();

  for await (const user of cursor) {
    checked += 1;
    try {
      const recordings = await Recording.find({ user: user._id })
        .select("createdAt")
        .lean();
      const status = getStreakStatus(recordings, user.timeZone, now);
      const due = dueReminder(user, status, now);
      if (!due) continue;
      if (!(await claim(user._id, due.slot, status.today))) continue;

      const payload = {
        ...pushPayloadFor(due.kind, status, texts),
        kind: due.kind,
        tag: `streak-${due.kind}`,
      };
      sent += await sendPushToUser(user, payload);
      // Open tabs refresh their streak card at the same moment.
      emitToUser(user._id, "streak:status", status);
    } catch (err) {
      console.error("Streak reminder failed for", String(user._id), err);
    }
  }
  return { checked, sent };
}

let timer = null;
let running = false;

function startReminderJob() {
  if (timer) return;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runReminders();
    } catch (err) {
      console.error("Streak reminder run failed:", err);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, RUN_EVERY_MS);
  setTimeout(tick, 30 * 1000); // first run shortly after start-up
}

module.exports = {
  startReminderJob,
  runReminders,
  dueReminder,
  autoRemindersOn,
  setAutoReminders,
  reminderTexts,
  saveReminderText,
};
