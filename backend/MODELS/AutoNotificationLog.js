// Round 22: which member already got which automatic notification (and for
// which round), so nobody gets the same one twice.
const mongoose = require("mongoose");

const autoNotificationLogSchema = new mongoose.Schema(
  {
    rule: { type: mongoose.Schema.Types.ObjectId, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    key: { type: String, required: true },
  },
  { timestamps: true },
);
autoNotificationLogSchema.index({ rule: 1, user: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("AutoNotificationLog", autoNotificationLogSchema);
