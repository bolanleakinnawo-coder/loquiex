import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import StepIndicator from "./StepIndicator";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepVerifyEmail from "./StepVerifyEmail";
import StepThree from "./StepThree";
import StepFour from "./StepFour";
import StepFive from "./StepFive";
import StepSix from "./StepSix";

const API_URL = import.meta.env.VITE_API_URL;

function RegistrationLayout() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [accountError, setAccountError] = useState(null);
  const submitInProgress = useRef(false);
  // Round 18 (Sheriff): the email is verified with a 6-digit code after
  // step 2. The sign-up token from a correct code goes with the sign up.
  const [codeScreen, setCodeScreen] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [codeNotice, setCodeNotice] = useState("");
  const [verified, setVerified] = useState({ email: "", token: "" });
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    firstName: "",
    surname: "",
    username: "",
    email: "",
    marketingOptIn: false,
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    role: "",
    roleOther: "",
    improvements: [],
    improvementOther: "",
    practiceFrequency: "",
    profilePhoto: null,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentStep, codeScreen]);

  const typedEmail = () => formData.email.trim().toLowerCase();

  const sendCode = async () => {
    setCodeBusy(true);
    setCodeError("");
    setCodeNotice("");
    try {
      await axios.post(`${API_URL}/user/signup/send-code`, {
        email: typedEmail(),
        fullName: `${formData.firstName.trim()} ${formData.surname.trim()}`.trim(),
      });
      return true;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (error.request
          ? "We couldn't reach the server. Check your connection and try again."
          : "Something went wrong. Please try again.");
      if (error.response?.status === 409) {
        setAccountError({ fields: { email: message } });
        setCodeScreen(false);
      } else {
        setCodeError(message);
      }
      return false;
    } finally {
      setCodeBusy(false);
    }
  };

  // Step 2's Continue: skip the code if this email is already verified.
  const handleStepTwoNext = async () => {
    // Round 19 (Sheriff): a taken username shows here, before they leave
    // this page. If the check can't reach the server, sign up still checks.
    try {
      const { data } = await axios.post(`${API_URL}/user/signup/check-username`, {
        username: formData.username.trim(),
      });
      if (data && data.available === false) {
        setAccountError({
          fields: { username: data.message || "This username is already taken." },
        });
        return;
      }
    } catch {
      // Carry on; the final sign up step reports a taken username.
    }
    if (verified.token && verified.email === typedEmail()) {
      nextStep();
      return;
    }
    // A 409 (email already has an account) sends them back to step 2.
    setCodeScreen(true);
    await sendCode();
  };

  const handleResendCode = async () => {
    if (await sendCode()) setCodeNotice(`We sent a new code to ${typedEmail()}.`);
  };

  const handleVerifyCode = async (code) => {
    setCodeBusy(true);
    setCodeError("");
    setCodeNotice("");
    try {
      const { data } = await axios.post(`${API_URL}/user/signup/verify-code`, {
        email: typedEmail(),
        code,
      });
      setVerified({ email: data.email, token: data.signupToken });
      setCodeScreen(false);
      nextStep();
    } catch (error) {
      setCodeError(
        error.response?.data?.message ||
          (error.request
            ? "We couldn't reach the server. Check your connection and try again."
            : "Something went wrong. Please try again."),
      );
    } finally {
      setCodeBusy(false);
    }
  };

  const updateFormData = (updates) => {
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const clearAccountError = (field) => {
    setAccountError((previous) => {
      if (!previous) return previous;
      if (previous.message) return null;

      const fields = { ...previous.fields };
      delete fields[field];
      return Object.keys(fields).length ? { fields } : null;
    });
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const previousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitInProgress.current) return;

    submitInProgress.current = true;
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "profilePhoto") {
          if (value) payload.append(key, value);
        } else if (key === "improvements") {
          payload.append(key, JSON.stringify(value));
        } else {
          payload.append(key, value);
        }
      });
      payload.append("signupToken", verified.token);
      const response = await axios.post(`${API_URL}/user/signup`, payload);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      // A team invite link opened while signed out comes back here (round 10).
      const from = location.state?.from;
      // Round 18 (Sheriff): new members land on Home. The free trial is
      // still offered in Practice and on Manage Membership.
      if (from?.pathname?.startsWith("/team/join/")) {
        navigate(from.pathname, { replace: true });
      } else {
        navigate("/app/home", { replace: true });
      }
    } catch (error) {
      console.error(error);
      const message = error.response?.data?.message || "";
      // Round 18: the verified email has timed out; verify it again.
      if (error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        setVerified({ email: "", token: "" });
        setAccountError({ message });
        setSubmitError("");
        setCurrentStep(2);
        return;
      }
      const responseErrors = error.response?.data?.errors || {};
      const fieldErrors = {};

      if (/email.*already exists/i.test(message)) {
        fieldErrors.email = message;
      }
      if (/username.*already (taken|in use)/i.test(message)) {
        fieldErrors.username = message;
      }
      if (responseErrors.email) fieldErrors.email = responseErrors.email;
      if (responseErrors.username)
        fieldErrors.username = responseErrors.username;
      if (responseErrors.firstName) fieldErrors.firstName = responseErrors.firstName;
      if (responseErrors.surname) fieldErrors.surname = responseErrors.surname;

      if (Object.keys(fieldErrors).length > 0) {
        setAccountError({ fields: fieldErrors });
        setSubmitError("");
        setCurrentStep(2);
        return;
      }

      const validationMessage = error.response?.data?.errors
        ? Object.values(error.response.data.errors)[0]
        : null;
      setSubmitError(
        validationMessage ||
          error.response?.data?.message ||
          (error.request
            ? "We couldn't reach the server. Check your connection and try again."
            : "Something went wrong. Please try again."),
      );
      if (error.response?.status === 409) {
        setAccountError({
          message:
            message ||
            "Some of these details are already in use. Review your name, username, and email.",
        });
        setSubmitError("");
        setCurrentStep(2);
      }
    } finally {
      submitInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <main className="registration-page registration-flow-page">
      <div className="registration-container">
        <StepIndicator currentStep={currentStep} />

        {currentStep === 1 && <StepOne onNext={nextStep} />}

        {currentStep === 2 && codeScreen && (
          <StepVerifyEmail
            email={typedEmail()}
            onVerify={handleVerifyCode}
            onResend={handleResendCode}
            onBack={() => {
              setCodeScreen(false);
              setCodeError("");
              setCodeNotice("");
            }}
            busy={codeBusy}
            error={codeError}
            notice={codeNotice}
          />
        )}

        {currentStep === 2 && !codeScreen && (
          <StepTwo
            onNext={handleStepTwoNext}
            onBack={previousStep}
            formData={formData}
            updateFormData={updateFormData}
            serverErrors={accountError?.fields || {}}
            serverError={accountError?.message || ""}
            onClearServerError={clearAccountError}
          />
        )}

        {currentStep === 3 && (
          <StepThree
            onNext={nextStep}
            onBack={previousStep}
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 4 && (
          <StepFour
            onNext={nextStep}
            onBack={previousStep}
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 5 && (
          <StepFive
            onNext={nextStep}
            onBack={previousStep}
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 6 && (
          <StepSix
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onBack={previousStep}
            formData={formData}
            updateFormData={updateFormData}
          />
        )}
      </div>
    </main>
  );
}

export default RegistrationLayout;
