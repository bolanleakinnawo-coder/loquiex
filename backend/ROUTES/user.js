const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { randomUUID, randomBytes, createHash, randomInt } = require("crypto");
const User = require("../MODELS/User"); // adjust path/casing to match your actual folder
const r2 = require("../config/r2");
const rateLimit = require("express-rate-limit");
const { planIdOf, subscriptionOf } = require("../utils/plans");
const PasswordReset = require("../MODELS/PasswordReset");
const EmailVerification = require("../MODELS/EmailVerification");
const SignupCode = require("../MODELS/SignupCode");
const { signToken, verifyToken } = require("../utils/authToken");
const { disconnectUser } = require("../services/realtime");
const { deleteAccount } = require("../services/accountDeletion");
const {
  sendEmail,
  passwordResetEmail,
  passwordChangedEmail,
  accountDeletedEmail,
  verifyEmailEmail,
  signupCodeEmail,
} = require("../services/email");

const router = express.Router();

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const { normalizeUsername, usernameQuery } = require("../utils/usernames");
// Indexed lookup (usernames are stored lowercase), not a full-collection scan.
const usernameLookup = (username) => usernameQuery(username);
const clientIpOf = (req) => rateLimit.ipKeyGenerator(req.ip || "");
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const handleProfilePhotoUpload = (req, res, next) => {
  upload.single("profilePhoto")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(413)
        .json({ message: "Profile photos must be smaller than 5 MB." });
    }

    console.error("Failed to receive profile photo:", error);
    return res.status(400).json({ message: "Could not process the profile photo." });
  });
};
const PROFILE_IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Slows down password guessing: 10 tries per 15 minutes per IP + account.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${rateLimit.ipKeyGenerator(req.ip)}|${String(req.body?.identifier || "").trim().toLowerCase()}`,
  message: { message: "Too many sign-in attempts. Please wait 15 minutes and try again." },
});

// Stops scripted mass sign-ups. Generous, because many members on the same
// mobile network can share one IP address.
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `signup|${clientIpOf(req)}`,
  message: { message: "Too many sign-ups from this network. Please try again in an hour." },
});

const generateToken = (user) => signToken(user);

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token)
      return res.status(401).json({ message: "Authentication required." });

    const { user } = await verifyToken(token, { full: true });
    req.user = user;
    next();
  } catch (err) {
    if (err.code) {
      return res.status(401).json({ message: err.message, code: err.code });
    }
    console.error("Auth check failed:", err);
    res.status(503).json({ message: "Please try again in a moment." });
  }
};

const isStrongPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  password.length <= 128 &&
  /[a-zA-Z]/.test(password) &&
  /[0-9]/.test(password);

const appUrl = () => (process.env.APP_URL || "").trim().replace(/\/+$/, "");
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

// ---------- EMAIL VERIFICATION (round 17) ----------
const VERIFY_HOURS = 24;

// Makes a fresh link (only the newest one works) and emails it.
async function sendVerificationEmail(user) {
  const base = appUrl();
  if (!base) {
    console.error("Verify email: APP_URL is not set, so no link can be made.");
    return false;
  }
  await EmailVerification.deleteMany({ user: user._id });
  const token = randomBytes(32).toString("base64url");
  await EmailVerification.create({
    user: user._id,
    email: user.email,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + VERIFY_HOURS * 60 * 60 * 1000),
  });
  const url = `${base}/verify-email?token=${token}`;
  const mail = verifyEmailEmail({ name: user.fullName, url, hours: VERIFY_HOURS });
  return sendEmail({ to: user.email, ...mail });
}

// 5 new links per hour per account, so nobody can flood an inbox.
const verifyResendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `verify-resend|${req.user?._id || clientIpOf(req)}`,
  message: { message: "Too many emails sent. Please wait an hour and try again." },
});
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `verify|${clientIpOf(req)}`,
  message: { message: "Too many tries. Please wait 15 minutes and try again." },
});
const RESET_MINUTES = 30;
const RESET_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const clientIp = (req) => rateLimit.ipKeyGenerator(req.ip || "");

// Forgot password: 15 requests per 15 minutes per IP, and 3 per hour for one
// email/username, so nobody can flood someone's inbox.
const forgotIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIp(req),
  message: { message: "Too many reset requests. Please wait 15 minutes and try again." },
});
const forgotAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `forgot|${String(req.body?.email || req.body?.identifier || "").trim().toLowerCase()}`,
  message: { message: "Too many reset requests. Please wait an hour and try again." },
});
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIp(req),
  message: { message: "Too many attempts. Please wait 15 minutes and try again." },
});
const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `delete|${clientIp(req)}`,
  message: { message: "Too many attempts. Please wait 15 minutes and try again." },
});

// ---------- SIGNUP ----------
// ---------- SIGN UP EMAIL CODE (round 18, Sheriff) ----------
// Step 2 of sign up emails a 6-digit code; the next screen checks it. The
// account can only be made with the sign-up token a correct code returns,
// and it is made already verified.
const CODE_MINUTES = 10;
const CODE_MAX_TRIES = 5;
const SIGNUP_TOKEN_HOURS = 2;

const codeSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `signup-code|${clientIpOf(req)}|${String(req.body?.email || "").trim().toLowerCase()}`,
  message: { message: "Too many codes sent. Please wait an hour and try again." },
});

const codeCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `signup-code-check|${clientIpOf(req)}`,
  message: { message: "Too many tries. Please wait 15 minutes and try again." },
});

router.post("/signup/send-code", codeSendLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const name = String(req.body?.fullName || "").trim().slice(0, 80);
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (await User.exists({ email })) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }
    const code = String(randomInt(0, 1000000)).padStart(6, "0");
    await SignupCode.findOneAndUpdate(
      { email },
      {
        $set: {
          codeHash: hashToken(`${email}|${code}`),
          attempts: 0,
          verifiedTokenHash: "",
          verifiedAt: null,
          expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
        },
      },
      { upsert: true },
    );
    const sent = await sendEmail({
      to: email,
      ...signupCodeEmail({ name, code, minutes: CODE_MINUTES }),
    });
    if (!sent && process.env.NODE_ENV === "production") {
      return res.status(503).json({
        message: "We couldn't send the code right now. Please try again in a moment.",
      });
    }
    res.json({ sent: true, email });
  } catch (err) {
    console.error("Sign up code failed:", err);
    res.status(503).json({
      message: "We couldn't send the code right now. Please try again in a moment.",
    });
  }
});

router.post("/signup/verify-code", codeCheckLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").replace(/\D/g, "");
    const row = await SignupCode.findOne({ email });
    if (!row || !row.codeHash || row.expiresAt <= new Date()) {
      return res.status(400).json({
        message: "This code has expired. Tap Resend code to get a new one.",
      });
    }
    if (row.attempts >= CODE_MAX_TRIES) {
      return res.status(400).json({
        message: "Too many wrong tries. Tap Resend code to get a new one.",
      });
    }
    if (code.length !== 6 || hashToken(`${email}|${code}`) !== row.codeHash) {
      row.attempts += 1;
      await row.save();
      return res.status(400).json({
        message: "That code isn't right. Check your email and try again.",
      });
    }
    const signupToken = randomBytes(32).toString("base64url");
    row.codeHash = "";
    row.verifiedTokenHash = hashToken(signupToken);
    row.verifiedAt = new Date();
    row.expiresAt = new Date(Date.now() + SIGNUP_TOKEN_HOURS * 60 * 60 * 1000);
    await row.save();
    res.json({ verified: true, email, signupToken });
  } catch (err) {
    console.error("Sign up code check failed:", err);
    res.status(503).json({ message: "Please try again in a moment." });
  }
});

router.post("/signup", signupLimiter, handleProfilePhotoUpload, async (req, res) => {
  try {
    const {
      fullName,
      username,
      email,
      marketingOptIn,
      phoneNumber,
      password,
      confirmPassword,
      role,
      roleOther,
      improvements,
      improvementOther,
      practiceFrequency,
    } = req.body;
    let selectedImprovements = improvements;
    if (typeof improvements === "string") {
      try {
        selectedImprovements = JSON.parse(improvements);
      } catch {
        selectedImprovements = [];
      }
    }

    const errors = {};

    if (!fullName || fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters.";
    }

    if (!username || !USERNAME_REGEX.test(username.trim())) {
      errors.username =
        "Username must be 3–20 characters (letters, numbers, underscores only).";
    }

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (
      !password ||
      password.length < 8 ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      errors.password =
        "Password must be at least 8 characters and include a letter and a number.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (!role) {
      errors.role = "Please select a role.";
    } else if (role === "Other" && !roleOther?.trim()) {
      errors.roleOther = "Please tell us more.";
    }

    if (!Array.isArray(selectedImprovements) || selectedImprovements.length === 0) {
      errors.improvements = "Please select at least one improvement area.";
    } else if (selectedImprovements.includes("Other") && !improvementOther?.trim()) {
      errors.improvementOther = "Please tell us more.";
    }

    if (!practiceFrequency) {
      errors.practiceFrequency = "Please select a practice frequency.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed.", errors });
    }

    // Round 18: the email must have been verified with the code first.
    const signupToken = String(req.body.signupToken || "");
    const codeRow = signupToken
      ? await SignupCode.findOne({
          email: email.trim().toLowerCase(),
          verifiedTokenHash: hashToken(signupToken),
          verifiedAt: { $ne: null },
          expiresAt: { $gt: new Date() },
        })
      : null;
    if (!codeRow) {
      return res.status(400).json({
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email first.",
      });
    }

    const existingEmail = await User.findOne({
      email: email.trim().toLowerCase(),
    });
    if (existingEmail) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    const normalizedUsername = normalizeUsername(username);
    const existingUsername = await User.findOne({
      username: usernameLookup(username),
    });
    if (existingUsername) {
      return res
        .status(409)
        .json({ message: "This username is already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let profileImageUrl = "";

    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Profile photo must be an image." });
      }

      const extension = req.file.mimetype.split("/")[1] || "jpg";
      const key = `profiles/${randomUUID()}.${extension}`;
      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        }),
      );
      profileImageUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    }

    const newUser = await User.create({
      fullName: fullName.trim(),
      username: normalizedUsername,
      displayUsername: username.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: typeof phoneNumber === "string" ? phoneNumber.trim() : "",
      password: hashedPassword,
      role,
      roleOther: role === "Other" ? roleOther.trim() : "",
      improvements: selectedImprovements,
      improvementOther: selectedImprovements.includes("Other")
        ? improvementOther.trim()
        : "",
      practiceFrequency,
      profileImageUrl,
      marketingOptIn: marketingOptIn === "true",
      marketingOptInAt:
        marketingOptIn === "true" ? new Date() : null,
      // Round 14: the free trial starts only when the member chooses it.
      trialByChoice: true,
      // Round 18: verified with the sign up code.
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    await SignupCode.deleteOne({ _id: codeRow._id }).catch(() => {});

    const token = generateToken(newUser);
    // Round 14: the automatic Welcome email.
    require("../services/autoEmails")
      .sendAutoEmail("welcome", newUser._id)
      .catch(() => {});
    // Round 18: no link needed, the code already verified the email.

    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.displayUsername || newUser.username,
        email: newUser.email,
        emailVerified: Boolean(newUser.emailVerified),
        profileImageUrl: newUser.profileImageUrl,
        createdAt: newUser.createdAt,
        plan: planIdOf(newUser),
        subscription: subscriptionOf(newUser),
        improvements: newUser.improvements,
        practiceFrequency: newUser.practiceFrequency,
      },
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0];
      const message =
        duplicateField === "email"
          ? "An account with this email already exists."
          : duplicateField === "username"
            ? "This username is already taken."
            : "An account with these details already exists.";
      return res.status(409).json({ message });
    }
    if (err.name === "ValidationError") {
      const validationMessage = Object.values(err.errors)
        .map((validationError) => validationError.message)
        .join(" ");
      return res.status(400).json({ message: validationMessage });
    }
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
});

// ---------- LOGIN ----------
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = email or username

    if (
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      !identifier.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Email/username and password are required." });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.trim().toLowerCase() },
        { username: usernameLookup(identifier) },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.displayUsername || user.username,
        email: user.email,
        emailVerified: Boolean(user.emailVerified),
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
        plan: planIdOf(user),
        subscription: subscriptionOf(user),
        improvements: user.improvements,
        practiceFrequency: user.practiceFrequency,
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
});

// ---------- UPDATE PROFILE ----------
router.put(
  "/profile",
  authenticate,
  upload.single("profilePhoto"),
  async (req, res) => {
    try {
      const {
        fullName,
        username,
        email,
        newPassword,
        confirmPassword,
        removeProfilePhoto,
      } = req.body;
      const errors = {};

      if (!fullName || fullName.trim().length < 2) {
        errors.fullName = "Full name must be at least 2 characters.";
      }
      if (!username || !USERNAME_REGEX.test(username.trim())) {
        errors.username =
          "Username must be 3–20 characters (letters, numbers, underscores only).";
      }
      if (!email || !EMAIL_REGEX.test(email.trim())) {
        errors.email = "Please enter a valid email address.";
      }
      if (newPassword || confirmPassword) {
        if (
          !newPassword ||
          newPassword.length < 8 ||
          !/[a-zA-Z]/.test(newPassword) ||
          !/[0-9]/.test(newPassword)
        ) {
          errors.newPassword =
            "New password must be at least 8 characters and include a letter and a number.";
        } else if (newPassword !== confirmPassword) {
          errors.confirmPassword = "Passwords do not match.";
        }
      }
      if (Object.keys(errors).length) {
        return res.status(400).json({ message: "Validation failed.", errors });
      }

      if (req.file && !PROFILE_IMAGE_EXTENSIONS[req.file.mimetype]) {
        return res.status(400).json({
          message: "Profile photo must be a JPEG, PNG, or WebP image.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = normalizeUsername(username);
      const existingUser = await User.findOne({
        $or: [
          { email: normalizedEmail },
          { username: usernameLookup(username) },
        ],
        _id: { $ne: req.user._id },
      });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "That email or username is already in use." });
      }

      req.user.fullName = fullName.trim();
      req.user.username = normalizedUsername;
      req.user.displayUsername = username.trim();
      // Round 17: a new email has to be verified again.
      const emailChanged = req.user.email !== normalizedEmail;
      req.user.email = normalizedEmail;
      if (emailChanged) {
        req.user.emailVerified = false;
        req.user.emailVerifiedAt = null;
      }
      if (req.file) {
        const extension = PROFILE_IMAGE_EXTENSIONS[req.file.mimetype];
        const key = `profiles/${randomUUID()}.${extension}`;
        await r2.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
          }),
        );
        req.user.profileImageUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
      } else if (removeProfilePhoto === "true") {
        req.user.profileImageUrl = "";
      }
      if (newPassword) {
        req.user.password = await bcrypt.hash(newPassword, 10);
        // Signs out every other device; this one gets a fresh token below.
        req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
        req.user.passwordChangedAt = new Date();
      }
      await req.user.save();
      if (emailChanged) {
        sendVerificationEmail(req.user).catch((e) =>
          console.error("Verify email failed:", e.message),
        );
      }
      if (newPassword) {
        disconnectUser(String(req.user._id), "session:revoked", {});
        PasswordReset.deleteMany({ user: req.user._id }).catch(() => {});
        const mail = passwordChangedEmail({ name: req.user.fullName, appUrl: appUrl() });
        sendEmail({ to: req.user.email, ...mail }).catch((e) =>
          console.error("Password-changed email failed:", e.message),
        );
      }

      res.json({
        message: "Profile updated successfully.",
        ...(newPassword ? { token: generateToken(req.user) } : {}),
        user: {
          id: req.user._id,
          fullName: req.user.fullName,
          username: req.user.displayUsername || req.user.username,
          email: req.user.email,
          emailVerified: Boolean(req.user.emailVerified),
          profileImageUrl: req.user.profileImageUrl,
          createdAt: req.user.createdAt,
          plan: planIdOf(req.user),
          subscription: subscriptionOf(req.user),
          improvements: req.user.improvements,
          practiceFrequency: req.user.practiceFrequency,
        },
      });
    } catch (err) {
      console.error(err);
      if (err.code === 11000 && err.keyPattern?.username) {
        return res.status(409).json({ message: "This username is already taken." });
      }
      res
        .status(500)
        .json({ message: "Something went wrong updating your profile." });
    }
  },
);

// ---------- VERIFY EMAIL (round 17) ----------
// Whether the signed-in member's email is verified (the app checks this to
// show or hide the reminder).
router.get("/email-status", authenticate, (req, res) => {
  res.json({
    email: req.user.email,
    emailVerified: Boolean(req.user.emailVerified),
  });
});

// Sends a new verification link to the signed-in member.
router.post("/verify-email/resend", authenticate, verifyResendLimiter, async (req, res) => {
  try {
    if (req.user.emailVerified) {
      return res.json({ emailVerified: true, message: "Your email is already verified." });
    }
    const sent = await sendVerificationEmail(req.user);
    if (!sent) {
      return res
        .status(503)
        .json({ message: "We couldn't send the email just now. Please try again later." });
    }
    res.json({ emailVerified: false, message: `We've sent a new link to ${req.user.email}.` });
  } catch (err) {
    console.error("Verify email resend failed:", err.message);
    res.status(500).json({ message: "We couldn't send the email just now. Please try again." });
  }
});

// The link in the email lands on /verify-email, which posts the token here.
router.post("/verify-email", verifyLimiter, async (req, res) => {
  const expired = {
    message: "This link has expired or was already used. Log in and ask for a new one.",
    code: "VERIFY_LINK_INVALID",
  };
  try {
    const token = String(req.body?.token || "");
    if (!RESET_TOKEN_RE.test(token)) return res.status(400).json(expired);
    const row = await EmailVerification.findOne({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() },
    });
    if (!row) return res.status(400).json(expired);
    const user = await User.findById(row.user);
    // The link only counts for the email it was sent to.
    if (!user || user.email !== row.email) {
      await row.deleteOne().catch(() => {});
      return res.status(400).json(expired);
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
    }
    await EmailVerification.deleteMany({ user: user._id });
    res.json({ emailVerified: true, email: user.email });
  } catch (err) {
    console.error("Verify email failed:", err.message);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ---------- FORGOT PASSWORD ----------
// Always answers the same way, whether or not the account exists, and does
// the lookup and email after replying, so nobody can use it to find out
// which emails have Loquiex accounts.
const FORGOT_REPLY = {
  message:
    "If an account matches that email, we've sent a link to reset your password. It expires in 30 minutes.",
};

async function sendResetLink(identifier, ip) {
  const value = identifier.trim();
  // Round 17 (Sheriff): email only, and only to an email the member has
  // verified, so a reset link never goes to an address nobody confirmed.
  const user = await User.findOne({ email: value.toLowerCase() }).select(
    "fullName email emailVerified",
  );
  if (!user) return;
  if (!user.emailVerified) {
    console.log("Forgot password: email not verified yet, so no link was sent.");
    return;
  }

  const base = appUrl();
  if (!base) {
    console.error("Forgot password: APP_URL is not set, so no link can be made.");
    return;
  }

  // Only the newest link works.
  await PasswordReset.deleteMany({ user: user._id, usedAt: null });
  const token = randomBytes(32).toString("base64url");
  await PasswordReset.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
    requestedIp: ip,
  });

  const url = `${base}/reset-password?token=${token}`;
  const mail = passwordResetEmail({ name: user.fullName, url, minutes: RESET_MINUTES });
  await sendEmail({ to: user.email, ...mail });
}

router.post("/forgot-password", forgotIpLimiter, forgotAccountLimiter, (req, res) => {
  const identifier = String(req.body?.email || req.body?.identifier || "");
  if (!identifier.trim() || identifier.length > 254) {
    return res.status(400).json({ message: "Please enter your email address." });
  }
  if (!EMAIL_REGEX.test(identifier.trim())) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }
  res.json(FORGOT_REPLY);
  sendResetLink(identifier, req.ip || "").catch((err) =>
    console.error("Forgot password failed:", err.message),
  );
});

async function findLiveReset(token) {
  if (!RESET_TOKEN_RE.test(String(token || ""))) return null;
  return PasswordReset.findOne({
    tokenHash: hashToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
}

// Lets the reset page say "this link has expired" before the member types.
router.post("/reset-password/check", resetLimiter, async (req, res) => {
  try {
    const reset = await findLiveReset(req.body?.token);
    res.json({ valid: Boolean(reset) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ---------- RESET PASSWORD ----------
router.post("/reset-password", resetLimiter, async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password must be 8–128 characters and include a letter and a number.",
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const expired = {
      message: "This reset link has expired or was already used. Please ask for a new one.",
      code: "RESET_LINK_INVALID",
    };
    if (!RESET_TOKEN_RE.test(String(token || ""))) return res.status(400).json(expired);

    // Marks the link used in the same step that finds it, so it can't be
    // used twice even if two requests arrive together.
    const reset = await PasswordReset.findOneAndUpdate(
      { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!reset) return res.status(400).json(expired);

    const user = await User.findById(reset.user);
    if (!user) return res.status(400).json(expired);

    user.password = await bcrypt.hash(password, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // signs out every device
    user.passwordChangedAt = new Date();
    await user.save();
    await PasswordReset.deleteMany({ user: user._id, _id: { $ne: reset._id } });
    disconnectUser(String(user._id), "session:revoked", {});

    const mail = passwordChangedEmail({ name: user.fullName, appUrl: appUrl() });
    sendEmail({ to: user.email, ...mail }).catch((e) =>
      console.error("Password-changed email failed:", e.message),
    );

    res.json({ message: "Your password has been reset. You can sign in now." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ---------- DELETE ACCOUNT ----------
// Needs the current password, and the word DELETE typed by the member.
router.delete("/account", deleteLimiter, authenticate, async (req, res) => {
  try {
    const { password, confirmText } = req.body || {};
    if (String(confirmText || "").trim() !== "DELETE") {
      return res.status(400).json({ message: "Type DELETE to confirm." });
    }
    if (!password || !(await bcrypt.compare(String(password), req.user.password))) {
      return res.status(401).json({
        message: "That password isn't right.",
        code: "WRONG_PASSWORD",
      });
    }

    const { fullName, email } = req.user;
    await deleteAccount(req.user);

    const mail = accountDeletedEmail({ name: fullName });
    sendEmail({ to: email, ...mail }).catch((e) =>
      console.error("Account-deleted email failed:", e.message),
    );

    res.json({ message: "Your account has been deleted." });
  } catch (err) {
    console.error("Account deletion failed:", err);
    res
      .status(500)
      .json({ message: "We couldn't delete your account just now. Please try again." });
  }
});

module.exports = router;
