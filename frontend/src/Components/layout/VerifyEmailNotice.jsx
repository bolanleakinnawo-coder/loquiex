// Round 17 (Sheriff, "Reminder only"): members who haven't verified their
// email can keep using Loquiex; this bar at the top reminds them, and lets
// them get a new link. Password reset links only go to a verified email.
import { useEffect, useState } from "react";
import { MailWarning, X } from "lucide-react";
import api from "../../api/axios";
import { getStoredUser } from "../../data/plans";
import "../../styles/GroupCall.css";

const HIDE_KEY = "loquiex.verifyNoticeHidden";

function saveVerified(email) {
  const user = getStoredUser();
  if (!user) return;
  localStorage.setItem(
    "user",
    JSON.stringify({ ...user, emailVerified: true, ...(email ? { email } : {}) }),
  );
}

export default function VerifyEmailNotice() {
  const stored = getStoredUser();
  const [email, setEmail] = useState(stored?.email || "");
  const [verified, setVerified] = useState(stored?.emailVerified === true);
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");

  // The server is the source of truth (older accounts, or a link opened on
  // another device).
  useEffect(() => {
    let active = true;
    api
      .get("/user/email-status")
      .then(({ data }) => {
        if (!active) return;
        setEmail(data.email || "");
        setVerified(Boolean(data.emailVerified));
        if (data.emailVerified) saveVerified(data.email);
      })
      .catch(() => {});
    const onVerified = () => setVerified(true);
    window.addEventListener("loquiex:email-verified", onVerified);
    return () => {
      active = false;
      window.removeEventListener("loquiex:email-verified", onVerified);
    };
  }, []);

  if (verified || hidden) return null;

  const resend = async () => {
    setSending(true);
    setNote("");
    try {
      const { data } = await api.post("/user/verify-email/resend");
      if (data.emailVerified) {
        saveVerified();
        setVerified(true);
        return;
      }
      setNote(data.message || "We've sent you a new link.");
    } catch (err) {
      setNote(
        err.response?.data?.message ||
          "We couldn't send the email just now. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const hide = () => {
    try {
      sessionStorage.setItem(HIDE_KEY, "1");
    } catch {
      // Storage blocked: hidden until the page reloads.
    }
    setHidden(true);
  };

  return (
    <div className="callbar callbar--full verify-notice" role="status">
      <MailWarning size={16} aria-hidden="true" />
      <div className="callbar-text">
        <strong>Verify your email</strong>
        <span>
          {note ||
            `We sent a link to ${email || "your email"}. Verify it so you can reset your password if you ever forget it.`}
        </span>
      </div>
      <button
        type="button"
        className="callbar-return"
        onClick={resend}
        disabled={sending}
      >
        {sending ? "Sending..." : "Resend link"}
      </button>
      <button
        type="button"
        className="callbar-icon"
        onClick={hide}
        aria-label="Hide for now"
      >
        <X size={16} />
      </button>
    </div>
  );
}
