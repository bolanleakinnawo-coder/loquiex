// Round 22 (Sheriff): small app-wide switches the admin changes in Admin
// (one row per setting). First use: automatic streak reminders on/off.
const mongoose = require("mongoose");

const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AppSetting", appSettingSchema);
