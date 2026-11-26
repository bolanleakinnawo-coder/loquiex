import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function StepTwo({
  onNext,
  onBack,
  formData,
  updateFormData,
  serverErrors = {},
  serverError = "",
  onClearServerError = () => {},
}) {
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = () => {
    const newErrors = {};

    // Round 19 (Sheriff): first name and surname, both required.
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    } else if (!/^[a-zA-Z][a-zA-Z\s'-]*$/.test(formData.firstName.trim())) {
      newErrors.firstName = "First name can only contain letters.";
    }

    if (!formData.surname.trim()) {
      newErrors.surname = "Surname is required.";
    } else if (!/^[a-zA-Z][a-zA-Z\s'-]*$/.test(formData.surname.trim())) {
      newErrors.surname = "Surname can only contain letters.";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required.";
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.username.trim())) {
      newErrors.username =
        "Username must be 3–20 characters (letters, numbers, underscores only).";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    } else if (
      !/[a-zA-Z]/.test(formData.password) ||
      !/[0-9]/.test(formData.password)
    ) {
      newErrors.password =
        "Password must include at least one letter and one number.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) {
      onNext();
    }
  };

  const handleChange = (field) => (e) => {
    updateFormData({ [field]: e.target.value });
    onClearServerError(field);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="registration-step-content">
      <div className="registration-header">
        <p className="registration-step">STEP 2 OF 6</p>
        <h1>Tell us about yourself</h1>
        <p>Let's get to know you.</p>
      </div>

      <form className="registration-form" onSubmit={(e) => e.preventDefault()}>
        {serverError && (
          <p className="form-error" role="alert">
            {serverError}
          </p>
        )}

        {/* First name */}
        <div className="form-field">
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="Enter your first name"
            value={formData.firstName}
            aria-invalid={Boolean(errors.firstName || serverErrors.firstName)}
            onChange={handleChange("firstName")}
          />
          {(errors.firstName || serverErrors.firstName) && (
            <p className="form-error">{errors.firstName || serverErrors.firstName}</p>
          )}
        </div>

        {/* Surname */}
        <div className="form-field">
          <label htmlFor="surname">Surname</label>
          <input
            id="surname"
            type="text"
            autoComplete="family-name"
            placeholder="Enter your surname"
            value={formData.surname}
            aria-invalid={Boolean(errors.surname || serverErrors.surname)}
            onChange={handleChange("surname")}
          />
          {(errors.surname || serverErrors.surname) && (
            <p className="form-error">{errors.surname || serverErrors.surname}</p>
          )}
        </div>

        {/* Username */}
        <div className="form-field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            placeholder="Choose a username"
            value={formData.username}
            aria-invalid={Boolean(errors.username || serverErrors.username)}
            onChange={handleChange("username")}
          />
          {(errors.username || serverErrors.username) && (
            <p className="form-error" role="alert">
              {errors.username || serverErrors.username}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="form-field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={formData.email}
            aria-invalid={Boolean(errors.email || serverErrors.email)}
            onChange={handleChange("email")}
          />
          {(errors.email || serverErrors.email) && (
            <p className="form-error" role="alert">
              {errors.email || serverErrors.email}
            </p>
          )}
          <div className="registration-email-opt-in">
            <input
              id="marketingOptIn"
              type="checkbox"
              checked={formData.marketingOptIn}
              onChange={(event) =>
                updateFormData({ marketingOptIn: event.target.checked })
              }
            />
            <label htmlFor="marketingOptIn">
              I&apos;d love to receive helpful communication tips, practice
              reminders, and updates from Loquiex.
            </label>
          </div>
        </div>

        {/* Password */}
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <div className="password-input-wrapper">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={formData.password}
              aria-invalid={Boolean(errors.password)}
              onChange={handleChange("password")}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="form-error">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div className="form-field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <div className="password-input-wrapper">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              aria-invalid={Boolean(errors.confirmPassword)}
              onChange={handleChange("confirmPassword")}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword((visible) => !visible)}
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="form-error">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button type="button" className="back-button" onClick={onBack}>
            Back
          </button>

          <button
            type="button"
            className="registration-next"
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}

export default StepTwo;
