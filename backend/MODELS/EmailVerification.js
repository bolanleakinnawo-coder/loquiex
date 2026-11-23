const mongoose = require("mongoose");

// Round 17: one row per "Verify your email" link. Only a SHA-256 hash of the
// link's token is stored, and the row remembers which email it was sent to,
// so a link for an old email can't verify a new one. MongoDB deletes rows on
// its own once expiresAt has passed (TTL index).
const emailVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("EmailVerification", emailVerificationSchema);
