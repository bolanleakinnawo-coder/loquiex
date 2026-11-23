import { useState } from "react";

// Round 18 (Sheriff): step 2 emails a 6-digit code, and this screen checks
// it before sign up carries on. It stays in the same tab, so it works the
// same in the installed app.
function StepVerifyEmail({
  email,
  onVerify,
  onResend,
  onBack,
  busy = false,
  error = "",
  notice = "",
}) {
  const [code, setCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length === 6 && !busy) onVerify(code);
  };

  return (
    <div className="registration-step-content">
      <div className="registration-header">
        <p className="registration-step">STEP 2 OF 6</p>
        <h1>Check your email</h1>
        <p>
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below to
          verify your email.
        </p>
      </div>

      <form className="registration-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="signupCode">Code</label>
          <input
            id="signupCode"
            className="registration-code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            aria-invalid={Boolean(error)}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {notice && !error && <p className="registration-code-notice">{notice}</p>}
          <button
            type="button"
            className="registration-code-resend"
            onClick={onResend}
            disabled={busy}
          >
            Resend code
          </button>
        </div>

        <div className="form-actions">
          <button type="button" className="back-button" onClick={onBack}>
            Back
          </button>
          <button
            type="submit"
            className="registration-next"
            disabled={code.length !== 6 || busy}
          >
            {busy ? "Checking..." : "Verify"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StepVerifyEmail;
