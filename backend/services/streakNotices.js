// The four streak notifications, matched to a member's streak status.
// The same wording is used for phone (push) notifications here and for the
// in-app cards in src/data/notifications.js on the frontend.
//
//   keep      has a streak going, hasn't practised today
//   restore   missed yesterday, today is the 24h grace day (local time)
//   comeback  lost their streak, or hasn't practised for a while
//   first     just registered, no practice yet

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function formatTimeLeft(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

// Which notice fits this status, respecting the member's switches.
// Streak pop-ups covers keep / restore / comeback; the first-streak welcome
// shows if either switch is on (same rule as the in-app pop-up).
function noticeKindFor(status, prefs = {}) {
  const streakOn = prefs.streakPopups !== false;
  const nudgesOn = prefs.practiceNudges !== false;
  switch (status.state) {
    case "new":
      return streakOn || nudgesOn ? "first" : null;
    case "active":
      return streakOn && status.current > 0 ? "keep" : null;
    case "grace":
      return streakOn && status.current > 0 ? "restore" : null;
    case "lost":
      return streakOn ? "comeback" : null;
    default:
      return null;
  }
}

// Round 23 (Sheriff): the admin can edit the phone reminder wording in
// Admin > Notifications. These are the starting texts. Words in curly
// brackets are filled in for each member:
//   {days}      their streak, e.g. "5 days"
//   {streak}    their streak as a number, e.g. "5"
//   {timeleft}  time left on their grace day, e.g. "3h 20m"
const PUSH_DEFAULTS = {
  keep: {
    label: "Keep the streak (7:00 pm)",
    title: "{days} of showing up. Let's keep it going.",
    body: "Complete today's practice to keep your streak alive.",
    action: "Practise today",
  },
  restore: {
    label: "Grace day (9:00 am and 8:00 pm)",
    title: "You can still save your streak.",
    body: "Life happens. You have {timeleft} left today to restore your {streak}-day streak.",
    action: "Restore my streak",
  },
  comeback: {
    label: "Come back (6:00 pm, every day until they practise)",
    title: "You're building a skill that stays with you.",
    body: "Give yourself another opportunity to practise expressing your thoughts clearly.",
    action: "Practise today",
  },
  first: {
    label: "First streak (6:00 pm, new members)",
    title: "Your first streak starts here.",
    body: "One practice today. One step towards expressing yourself with confidence.",
    action: "Start my streak",
  },
};

function fillWords(text, status) {
  const n = status?.current || 0;
  const values = {
    days: plural(n, "day"),
    streak: String(n),
    timeleft: formatTimeLeft(status?.restoreMsLeft || 0),
  };
  return String(text || "").replace(/\{(\w+)\}/g, (m, w) => (values[w] !== undefined ? values[w] : m));
}

// Short text for a phone notification. `custom` is the admin's saved
// wording ({ keep: { title, body }, ... }); missing parts use the defaults.
function pushPayloadFor(kind, status, custom = {}) {
  const d = PUSH_DEFAULTS[kind];
  if (!d) return null;
  const saved = custom?.[kind] || {};
  return {
    title: fillWords(saved.title || d.title, status),
    body: fillWords(saved.body || d.body, status),
    action: d.action,
    url: "/app/practice",
  };
}

module.exports = { noticeKindFor, pushPayloadFor, formatTimeLeft, PUSH_DEFAULTS };
