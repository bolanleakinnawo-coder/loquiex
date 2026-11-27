// Round 22 (Sheriff): automatic notifications. The admin writes a message,
// picks a starting point and a time (hours or days), and switches it on.
// Each member gets it on their own timing:
//
//   signup         X after that member signed up (once)
//   trial_start    X after that member started the free trial (once)
//   plan_end       X before that member's plan ends (once per plan period)
//   last_practice  X after their last practice, then again every day until
//                  they practise (members who never practised: from sign-up)
//
// For the "once" starting points a member only gets it within a day of
// their own time, so switching one on doesn't send it to everyone who
// signed up long ago. Delivered like Admin > Notifications: a phone
// notification where allowed, and an in-app notice if Loquiex is open.
const User = require("../MODELS/User");
const Recording = require("../MODELS/Recording");
const AutoNotification = require("../MODELS/AutoNotification");
const AutoNotificationLog = require("../MODELS/AutoNotificationLog");
const { pushReady, sendPushToUser } = require("./push");
const { emitToUser } = require("./realtime");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WINDOW = DAY;

const TRIGGERS = [
  { id: "signup", label: "After they sign up", word: "after they sign up", url: "/app/home" },
  { id: "last_practice", label: "After their last practice (repeats every day until they practise)", word: "after their last practice, then every day until they practise", url: "/app/practice" },
  { id: "trial_start", label: "After they start the free trial", word: "after they start the free trial", url: "/app/practice" },
  { id: "plan_end", label: "Before their plan ends", word: "before their plan ends", url: "/app/membership" },
];
const TRIGGER_BY_ID = Object.fromEntries(TRIGGERS.map((t) => [t.id, t]));

const USER_FIELDS = { fullName: 1, username: 1, displayUsername: 1, pushSubscriptions: 1 };

function offsetMs(rule) {
  return Math.max(0, Number(rule.amount) || 0) * (rule.unit === "days" ? DAY : HOUR);
}

function firstName(user) {
  const full = String(user?.fullName || "").trim();
  if (full) return full.split(/\s+/)[0];
  return user?.displayUsername || user?.username || "there";
}

// [{ userId, key }] due for this rule right now.
async function dueFor(rule, now) {
  const off = offsetMs(rule);
  const t = now.getTime();
  if (rule.trigger === "signup" || rule.trigger === "trial_start") {
    const field = rule.trigger === "signup" ? "createdAt" : "aiTrialStartedAt";
    const users = await User.find(
      { [field]: { $gte: new Date(t - off - WINDOW), $lte: new Date(t - off) } },
      { _id: 1 },
    ).lean();
    return users.map((u) => ({ userId: u._id, key: "once" }));
  }
  if (rule.trigger === "plan_end") {
    const range = { $gt: now, $gte: new Date(t + off - WINDOW), $lte: new Date(t + off) };
    const users = await User.find(
      { $or: [{ planExpiresAt: range }, { teamPlanExpiresAt: range }] },
      { planExpiresAt: 1, teamPlanExpiresAt: 1 },
    ).lean();
    const out = [];
    for (const u of users) {
      for (const [name, value] of [["own", u.planExpiresAt], ["team", u.teamPlanExpiresAt]]) {
        if (!value) continue;
        const ends = new Date(value).getTime();
        const due = ends - off;
        if (ends > t && due <= t && due >= t - WINDOW) {
          out.push({ userId: u._id, key: `${name}:${new Date(ends).toISOString().slice(0, 10)}` });
        }
      }
    }
    return out;
  }
  if (rule.trigger === "last_practice") {
    const rows = await Recording.aggregate([
      { $group: { _id: "$user", last: { $max: "$createdAt" } } },
    ]);
    const last = new Map(rows.map((r) => [String(r._id), new Date(r.last).getTime()]));
    const users = await User.find({ createdAt: { $lte: new Date(t - off) } }, { createdAt: 1 }).lean();
    const out = [];
    for (const u of users) {
      const anchor = last.get(String(u._id)) ?? new Date(u.createdAt).getTime();
      const first = anchor + off;
      if (first > t) continue;
      const round = Math.floor((t - first) / DAY);
      out.push({ userId: u._id, key: `${anchor}:${round}` });
    }
    return out;
  }
  return [];
}

async function send(rule, user) {
  const trigger = TRIGGER_BY_ID[rule.trigger];
  const body = String(rule.message).replace(/\{name\}/g, firstName(user));
  const payload = {
    kind: "admin",
    title: body,
    body,
    url: trigger?.url || "/app/home",
    action: "Open",
    tag: `auto-${rule._id}`,
  };
  emitToUser(user._id, "learn:notice", payload);
  if (pushReady()) await sendPushToUser(user, payload);
}

async function runRule(rule, now) {
  const all = await dueFor(rule, now);
  if (!all.length) return 0;
  // Skip the ones already sent without trying to claim them again.
  const done = await AutoNotificationLog.find(
    { rule: rule._id, key: { $in: [...new Set(all.map((d) => d.key))] } },
    { user: 1, key: 1 },
  ).lean();
  const seen = new Set(done.map((d) => `${d.user}|${d.key}`));
  const due = all.filter((d) => !seen.has(`${d.userId}|${d.key}`));
  let sent = 0;
  for (const { userId, key } of due) {
    try {
      // Claim first: the unique index stops a second send.
      await AutoNotificationLog.create({ rule: rule._id, user: userId, key });
    } catch (err) {
      if (err?.code === 11000) continue;
      throw err;
    }
    const user = await User.findById(userId, USER_FIELDS);
    if (!user) continue;
    try {
      await send(rule, user);
      sent += 1;
    } catch (err) {
      console.error("Automatic notification failed for", String(userId), err.message);
    }
  }
  if (sent) {
    await AutoNotification.updateOne(
      { _id: rule._id },
      { $inc: { sentCount: sent }, $set: { lastSentAt: now } },
    );
  }
  return sent;
}

async function runAutoNotifications(now = new Date()) {
  const rules = await AutoNotification.find({ enabled: true }).lean();
  let sent = 0;
  for (const rule of rules) {
    if (!TRIGGER_BY_ID[rule.trigger]) continue;
    try {
      sent += await runRule(rule, now);
    } catch (err) {
      console.error("Automatic notification rule failed:", err.message);
    }
  }
  return { sent };
}

let timer = null;
function startAutoNotificationJob() {
  if (timer) return;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runAutoNotifications();
    } catch (err) {
      console.error("Automatic notifications failed:", err.message);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, 10 * 60 * 1000);
  timer.unref?.();
  setTimeout(tick, 90 * 1000).unref?.();
}

function publicRule(r) {
  const trigger = TRIGGER_BY_ID[r.trigger];
  return {
    id: String(r._id),
    message: r.message,
    trigger: r.trigger,
    triggerLabel: trigger?.label || r.trigger,
    amount: r.amount,
    unit: r.unit,
    enabled: r.enabled !== false,
    sentCount: r.sentCount || 0,
    lastSentAt: r.lastSentAt || null,
  };
}

// Checks the admin's input. Returns { value } or { error }.
function cleanRule(input = {}, { partial = false } = {}) {
  const out = {};
  if (!partial || input.message !== undefined) {
    const message = String(input.message || "").trim();
    if (!message) return { error: "Write the message." };
    if (message.length > 500) return { error: "Keep the message to 500 characters." };
    out.message = message;
  }
  if (!partial || input.trigger !== undefined) {
    if (!TRIGGER_BY_ID[input.trigger]) return { error: "Choose when it is sent." };
    out.trigger = input.trigger;
  }
  if (!partial || input.amount !== undefined) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1000 || Math.floor(amount) !== amount) {
      return { error: "Set the time as a whole number from 0 to 1000." };
    }
    out.amount = amount;
  }
  const trigger = out.trigger || input.currentTrigger;
  if (trigger === "last_practice" && out.amount !== undefined && out.amount < 1) {
    return { error: "For last practice, set at least 1 hour." };
  }
  if (!partial || input.unit !== undefined) {
    if (!["hours", "days"].includes(input.unit)) return { error: "Choose hours or days." };
    out.unit = input.unit;
  }
  if (input.enabled !== undefined) out.enabled = Boolean(input.enabled);
  return { value: out };
}

module.exports = {
  AUTO_TRIGGERS: TRIGGERS,
  runAutoNotifications,
  startAutoNotificationJob,
  publicRule,
  cleanRule,
};
