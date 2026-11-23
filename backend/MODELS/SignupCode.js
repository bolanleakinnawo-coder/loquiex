const mongoose = require("mongoose");

// Round 18 (Sheriff): sign up verifies the email with a 6-digit code before
// the account is made. One row per email. Only hashes are stored. Once the
// code is right, the row holds a short-lived sign-up token that /signup
// needs. MongoDB deletes rows on its own once expiresAt has passed.
const signupCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    codeHash: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    verifiedTokenHash: { type: String, default: "" },
    verifiedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

signupCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("SignupCode", signupCodeSchema);
