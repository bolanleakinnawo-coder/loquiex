import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LinkIcon, MailCheck } from "lucide-react";
import axios from "axios";
import { getStoredUser } from "../data/plans";

const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = "loquiex.verifyToken";

// Round 17: the link in the "Verify your email" email lands here
// (?token=...). The token is moved out of the address bar straight away,
// like the reset page does.
function readToken() {
  const fromUrl = new URLSearchParams(window.location.search).get("token");
  try {
    if (fromUrl) {
      sessionStorage.setItem(TOKEN_KEY, fromUrl);
      window.history.replaceState(null, "", window.location.pathname);
      return fromUrl;
    }
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return fromUrl || "";
  }
}

function forgetToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked: nothing kept.
  }
}

function VerifyEmail() {
  const [token] = useState(readToken);
  const [status, setStatus] = useState(token ? "checking" : "invalid");
  const [email, setEmail] = useState("");
  const signedIn = Boolean(localStorage.getItem("token"));

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    axios
      .post(`${API_URL}/user/verify-email`, { token })
      .then((res) => {
        if (!active) return;
        forgetToken();
        setEmail(res.data.email || "");
        // Update the saved copy so the reminder goes away at once.
        const user = getStoredUser();
        if (user && (!res.data.email || user.email === res.data.email)) {
          localStorage.setItem(
            "user",
            JSON.stringify({ ...user, emailVerified: true }),
          );
        }
        window.dispatchEvent(new Event("loquiex:email-verified"));
        setStatus("done");
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.data?.code === "VERIFY_LINK_INVALID") {
          forgetToken();
          setStatus("invalid");
        } else {
          setStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="registration-page login-page">
      <div className="registration-container">
        {status === "checking" && (
          <div className="registration-header">
            <h1>Verifying your email…</h1>
            <p>This only takes a moment.</p>
          </div>
        )}

        {status === "done" && (
          <>
            <div className="registration-header">
              <span className="auth-icon" aria-hidden="true">
                <MailCheck size={26} />
              </span>
              <h1>Your email is verified</h1>
              <p>
                {email ? (
                  <>
                    <strong className="auth-strong">{email}</strong> is now
                    confirmed. If you ever forget your password, we&apos;ll
                    send the reset link there.
                  </>
                ) : (
                  "If you ever forget your password, we'll send the reset link to this email."
                )}
              </p>
            </div>
            <Link
              to={signedIn ? "/app/home" : "/login"}
              className="registration-next auth-full auth-link-button"
            >
              {signedIn ? "Go to Loquiex" : "Log in"}
            </Link>
          </>
        )}

        {status === "invalid" && (
          <>
            <div className="registration-header">
              <span className="auth-icon" aria-hidden="true">
                <LinkIcon size={24} />
              </span>
              <h1>This link has expired</h1>
              <p>
                Verification links last 24 hours and only the newest one works.
                Log in and tap Resend link to get a new one.
              </p>
            </div>
            <Link
              to={signedIn ? "/app/home" : "/login"}
              className="registration-next auth-full auth-link-button"
            >
              {signedIn ? "Go to Loquiex" : "Log in"}
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="registration-header">
              <h1>Something went wrong</h1>
              <p>We couldn&apos;t verify your email just now. Please open the link again in a moment.</p>
            </div>
            <button
              type="button"
              className="registration-next auth-full"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </>
        )}

        {!signedIn && (
          <p className="login-switch">
            <Link to="/login" className="auth-back-link">
              <ArrowLeft size={15} /> Back to log in
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

export default VerifyEmail;
