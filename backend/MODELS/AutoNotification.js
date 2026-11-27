// Round 22 (Sheriff): automatic notifications the admin sets up in
// Admin > Notifications. Each one goes to every member on their own timing,
// counted from a starting point (e.g. 24 hours after that member signs up).
// The message is read when it is sent, so an edit shows from the next send.
const mongoose = require("mongoose");

const autoNotificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, maxlength: 500 },
    // signup | last_practice | trial_start | plan_end (see services/autoNotifications.js)
    trigger: { type: String, required: true },
    amount: { type: Number, required: true, min: 0, max: 1000 },
    unit: { type: String, enum: ["hours", "days"], default: "hours" },
    enabled: { type: Boolean, default: true },
    sentCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AutoNotification", autoNotificationSchema);
