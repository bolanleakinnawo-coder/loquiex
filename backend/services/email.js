// Transactional email (password reset, password changed, account deleted).
//
// Works with Resend (recommended) or Brevo, over their HTTPS APIs, so no
// extra npm package is needed. Set ONE of these on Render:
//
//   RESEND_API_KEY   re_...            https://resend.com/api-keys
//   BREVO_API_KEY    xkeysib-...       https://app.brevo.com/settings/keys/api
//
// and the sender (must be a domain/sender you verified with that provider):
//
//   EMAIL_FROM       Loquiex <no-reply@yourdomain.com>
//   EMAIL_REPLY_TO   (optional) support@yourdomain.com
//
// With neither key set, nothing is sent: outside production the email is
// printed to the server log instead, so the flow can be tested locally.

const TIMEOUT_MS = 15000;

function provider() {
  if ((process.env.RESEND_API_KEY || "").trim()) return "resend";
  if ((process.env.BREVO_API_KEY || "").trim()) return "brevo";
  return null;
}

function isConfigured() {
  return Boolean(provider() && parseFrom(process.env.EMAIL_FROM));
}

// "Loquiex <no-reply@x.com>" -> { name: "Loquiex", email: "no-reply@x.com" }
function parseFrom(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || "Loquiex", email: match[2].trim() };
  return { name: "Loquiex", email: raw };
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Email provider error ${res.status}: ${text.slice(0, 300)}`);
  }
}

async function sendEmail({ to, subject, html, text }) {
  const which = provider();
  const from = parseFrom(process.env.EMAIL_FROM);
  const replyTo = (process.env.EMAIL_REPLY_TO || "").trim();

  if (!which || !from) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "Email not sent: set RESEND_API_KEY (or BREVO_API_KEY) and EMAIL_FROM.",
      );
    } else {
      console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n${text}\n`);
    }
    return false;
  }

  if (which === "resend") {
    await postJson(
      "https://api.resend.com/emails",
      { Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}` },
      {
        from: `${from.name} <${from.email}>`,
        to: [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      },
    );
  } else {
    await postJson(
      "https://api.brevo.com/v3/smtp/email",
      { "api-key": process.env.BREVO_API_KEY.trim(), accept: "application/json" },
      {
        sender: from,
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      },
    );
  }
  return true;
}

// ---------- Templates (Loquiex colours: near-black, olive, off-white) ----------

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

// Round 18 (Sheriff): every email reads like a normal written message in
// plain text. No coloured boxes.
// Round 22 (Sheriff): no logo, the subject is not repeated at the top of
// the email (it shows only as the subject), and buttons are brand CTAs.
// Round 22 (Sheriff): emails use 17px text, and a button is the brand CTA
// (the Home tab's olive button: #646742 with #f1ecde text).
const CTA_STYLE =
  "display:inline-block;background:#646742;color:#f1ecde;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:600;line-height:1.2;text-decoration:none;padding:13px 20px;border-radius:10px";

function layout({ paragraphs, button, footer, pasteLink = false }) {
  const font = "font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.6";
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join("");
  const cta = button
    ? `<p style="margin:8px 0 16px"><a href="${escapeHtml(button.url)}" style="${CTA_STYLE}">${escapeHtml(button.label)}</a></p>${
        pasteLink
          ? `
<p style="margin:0 0 16px;word-break:break-all">Or paste this link into your browser:<br>${escapeHtml(button.url)}</p>`
          : ""
      }`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:24px 16px;${font}">
<div style="max-width:560px;${font}">
${body}${cta}${footer ? `<p style="margin:16px 0 0">${footer}</p>` : ""}
</div></body></html>`;
}

function passwordResetEmail({ name, url, minutes }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return {
    subject: "Reset your Loquiex password",
    html: layout({
      paragraphs: [
        greeting,
        `We got a request to reset the password for your Loquiex account. This link works once and expires in ${minutes} minutes.`,
      ],
      button: { label: "Choose a new password", url },
      footer:
        "If you didn't ask for this, you can ignore this email. Your password won't change.",
    }),
    text: `${name ? `Hi ${name},` : "Hi,"}\n\nReset your Loquiex password with this link (works once, expires in ${minutes} minutes):\n${url}\n\nIf you didn't ask for this, ignore this email. Your password won't change.`,
  };
}

function passwordChangedEmail({ name, appUrl }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const resetUrl = appUrl ? `${appUrl}/forgot-password` : "";
  return {
    subject: "Your Loquiex password was changed",
    html: layout({
      paragraphs: [
        greeting,
        "The password for your Loquiex account was just changed, and every device was signed out.",
        resetUrl
          ? `If this wasn't you, <a href="${escapeHtml(resetUrl)}" >reset your password now</a> and reply to this email.`
          : "If this wasn't you, reset your password now and reply to this email.",
      ],
      footer: "This is a security notice about your account.",
    }),
    text: `${name ? `Hi ${name},` : "Hi,"}\n\nThe password for your Loquiex account was just changed, and every device was signed out.\nIf this wasn't you, reset it now${resetUrl ? `: ${resetUrl}` : ""} and reply to this email.`,
  };
}

function accountDeletedEmail({ name }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return {
    subject: "Your Loquiex account has been deleted",
    html: layout({
      paragraphs: [
        greeting,
        "Your Loquiex account, recordings, feedback and wins have been deleted, as you asked. You're welcome back any time.",
      ],
      footer:
        "If you didn't do this, reply to this email straight away so we can help.",
    }),
    text: `${name ? `Hi ${name},` : "Hi,"}\n\nYour Loquiex account, recordings, feedback and wins have been deleted, as you asked.\nIf you didn't do this, reply to this email straight away.`,
  };
}

// Round 17: sent after sign up, and again when the member changes their email
// or asks for a new link.
function verifyEmailEmail({ name, url, hours }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return {
    subject: "Verify your Loquiex email",
    html: layout({
      paragraphs: [
        greeting,
        `Please confirm this is your email so you can always get back into your Loquiex account, for example if you forget your password. This link expires in ${hours} hours.`,
      ],
      button: { label: "Verify my email", url },
      footer:
        "If you didn't create a Loquiex account, you can ignore this email.",
    }),
    text: `${name ? `Hi ${name},` : "Hi,"}\n\nPlease confirm this is your email so you can always get back into your Loquiex account, for example if you forget your password. This link expires in ${hours} hours:\n${url}\n\nIf you didn't create a Loquiex account, you can ignore this email.`,
  };
}

// Round 18: the 6-digit code sent during sign up.
function signupCodeEmail({ name, code, minutes }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return {
    subject: `Your Loquiex code is ${code}`,
    html: layout({
      paragraphs: [
        greeting,
        `Enter this code in Loquiex to verify your email. It expires in ${minutes} minutes.`,
        `<strong style="font-size:24px">${escapeHtml(code)}</strong>`,
      ],
      footer:
        "If you didn't start signing up for Loquiex, you can ignore this email.",
    }),
    text: `${name ? `Hi ${name},` : "Hi,"}\n\nEnter this code in Loquiex to verify your email. It expires in ${minutes} minutes:\n\n${code}\n\nIf you didn't start signing up for Loquiex, you can ignore this email.`,
  };
}

// Team plans (round 10): an invitation from a Team Admin.
function teamInviteEmail({ adminName, teamName, planName, url }) {
  const team = teamName || "a Loquiex team";
  return {
    subject: `You've been invited to join ${team} on Loquiex`,
    html: layout({
      paragraphs: [
        `${escapeHtml(adminName || "Your Team Admin")} invited you to join ${escapeHtml(team)} on Loquiex.`,
        `Team plan: ${escapeHtml(planName)}. Your subscription cost is covered by the team.`,
      ],
      button: { label: "Accept invitation", url },
      footer:
        "Already have a Loquiex account? Sign in to join your team. If you weren't expecting this, you can ignore this email.",
    }),
    text: `${adminName || "Your Team Admin"} invited you to join ${team} on Loquiex.\nTeam plan: ${planName}. Your subscription cost is covered by the team.\n\nAccept invitation: ${url}`,
  };
}

// Round 14: an email the admin wrote in Admin > Emails. `body` is plain
// text; a blank line starts a new paragraph. An optional button links to
// the app.
function adminTextEmail({ subject, body, button }) {
  const paragraphs = String(body || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    subject,
    html: layout({
      paragraphs: paragraphs.map((p) => escapeHtml(p).replace(/\n/g, "<br>")),
      button,
      // Round 19 (Sheriff): no "Or paste this link" line and no footer line.
      footer: "",
      pasteLink: false,
    }),
    text: `${paragraphs.join("\n\n")}${button ? `\n\n${button.label}: ${button.url}` : ""}`,
  };
}

module.exports = {
  signupCodeEmail,
  adminTextEmail,
  teamInviteEmail,
  sendEmail,
  isConfigured,
  passwordResetEmail,
  passwordChangedEmail,
  accountDeletedEmail,
  verifyEmailEmail,
};
