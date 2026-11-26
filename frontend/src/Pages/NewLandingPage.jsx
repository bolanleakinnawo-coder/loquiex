// New public landing page (Sheriff, 2026-11-26). Route "/landingpage".
// The previous landing page (Pages/LandingPage.jsx) is kept in the project
// but no longer routed.
//
// Sections, in Sheriff's order:
//   1. Hero: "Option 1: Centred headline with app preview", with the solo
//      practice phone video in place of the laptop preview.
//   2. Your journey with Loquiex: 4 steps, dark and olive cards mixed.
//   3. Made for your progress  (copied from the old landing page)
//   4. Membership               (today's plans, no prices: Sheriff)
//   5. FAQs                     (copied from the old landing page)
//
// All wording is Sheriff's. Please don't reword it.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, Menu, Mic, X } from "lucide-react";

import brandLogo from "../assets/landing/loquiex-logo.png";
import journeyStep1 from "../assets/landing-new/journey-step-1.webp";
import journeyStep2 from "../assets/landing-new/journey-step-2.webp";
import journeyStep3 from "../assets/landing-new/journey-step-3.webp";
import journeyStep4 from "../assets/landing-new/journey-step-4.webp";
import { PLANS as APP_PLANS } from "../data/plans";
import "../styles/PublicLanding.css";
import "../styles/NewLanding.css";

const NAV_LINKS = [
  { label: "The platform", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Plans", href: "#plans" },
  { label: "FAQs", href: "#faqs" },
];

const JOURNEY = [
  {
    num: "01",
    eyebrow: "Step 01 · Get started",
    title: "Find your starting point.",
    body: "Choose a practice category, explore speaking prompts and select a practice level that suits you.",
    image: journeyStep1,
    alt: "Spin the Jar: pick Surprise me or a practice category",
  },
  {
    num: "02",
    eyebrow: "Step 02 · Practise",
    title: "Put your thoughts into words.",
    body: "Prepare your response, speak aloud and practise expressing your ideas without depending on a script.",
    image: journeyStep2,
    alt: "A speaking prompt with the recording button",
    olive: true,
  },
  {
    num: "03",
    eyebrow: "Step 03 · Get feedback",
    title: "Understand how you communicate.",
    body: "Review your response and see where you can improve.",
    image: journeyStep3,
    alt: "Practice review with the overall speaking score",
  },
  {
    num: "04",
    eyebrow: "Step 04 · Keep growing",
    title: "Learn, participate and keep practising.",
    body: "Use learning resources, practise with others and build consistency.",
    image: journeyStep4,
    alt: "A group practice call with a discussion prompt",
    olive: true,
  },
];

// ---------- Copied from the old landing page ----------
const FOR_YOU = [
  "You have ideas but sometimes struggle to put them into words.",
  "You want to contribute more confidently at work.",
  "You want to become a better public speaker.",
  "You want to express yourself more clearly in everyday conversations.",
  "You want to make communication practice part of your routine.",
];

// Membership cards (Sheriff, 2026-11-26): today's plans, names, taglines and
// features straight from data/plans.js (so they always match Manage
// Membership), the old landing page pills, no prices, and an "Explore plan"
// button on every card.
const PLAN_STYLE = {
  bloom: { pill: "Popular choice" },
  flourish: { pill: "More access", featured: true },
  infinity: { pill: "Premium", dark: true },
};
const PLANS = APP_PLANS.map((p) => ({ ...p, ...PLAN_STYLE[p.id] }));

const FAQS = [
  {
    q: "What is Loquiex?",
    a: "Loquiex is a communication practice platform that helps you organise your thoughts, express yourself clearly and build confidence through practice.",
  },
  {
    q: "What happens when I join?",
    a: "You can explore the platform, choose a speaking prompt and begin solo practice. You can also explore learning resources, track your activity and participate in other available features based on your membership.",
  },
  {
    q: "Can I use Loquiex for free?",
    a: "Yes. You can start with the Free membership and access its included features without a monthly subscription.",
  },
  {
    q: "Do I need AI to practise?",
    a: "No. You can practise speaking on your own. AI feedback is an additional feature available through paid memberships.",
  },
  {
    q: "How does AI feedback work?",
    a: "After a speaking session, AI reviews your speech and provides feedback to help you understand your communication strengths and areas to improve.",
  },
  {
    q: "What is group practice?",
    a: "Group practice lets you join or host audio-only sessions with other members to practise speaking in a group setting.",
  },
  {
    q: "What is the difference between sharing a practice session and sharing a win?",
    a: "A practice session card announces that you have completed a speaking practice. A win is an achievement shared from your profile and displayed on the Loquiex community wall.",
  },
  {
    q: "Can I track my progress?",
    a: "Yes. Your stats and milestones help you follow your practice activity and recognise your progress.",
  },
  {
    q: "What is the Loquiex dashboard?",
    a: "Your dashboard brings together your practice activity and community information, including your position on the leaderboard.",
  },
  {
    q: "Are there learner discounts?",
    a: "Learner discount benefits are included in the Flourish and Infinity plans. Eligibility and verification requirements apply.",
  },
  {
    q: "Can I change my membership plan?",
    a: "Plan changes are subject to the subscription and billing terms shown when you manage your membership.",
  },
];

// Signed in on this device? (Storage can be blocked in private mode.)
function hasToken() {
  try {
    return Boolean(localStorage.getItem("token"));
  } catch {
    return false;
  }
}

// Safari can't show the see-through WebM, so it gets the MP4 that already
// has the page background behind the phone.
function isSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS\/|Edg\/|OPR\/|Android/.test(ua);
}

function PhoneVideo() {
  const ref = useRef(null);
  const safari = isSafari();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // Some phones block autoplay until asked; muted video is allowed.
    video.muted = true;
    const playing = video.play();
    if (playing?.catch) playing.catch(() => {});
  }, []);

  return (
    <div className="nl-phone">
      <video
        ref={ref}
        className="nl-phone-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/landing/loquiex-solo-practice-poster.webp"
        aria-label="Solo practice on Loquiex: choose a topic, speak and get feedback"
      >
        {safari ? (
          <source src="/landing/loquiex-solo-practice.mp4" type="video/mp4" />
        ) : (
          <>
            <source src="/landing/loquiex-solo-practice.webm" type="video/webm" />
            <source src="/landing/loquiex-solo-practice.mp4" type="video/mp4" />
          </>
        )}
      </video>
    </div>
  );
}

export default function NewLandingPage() {
  const signedIn = hasToken();
  const startTo = signedIn ? "/app/home" : "/register";
  const planTo = signedIn ? "/app/membership" : "/register";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = "Loquiex · Practise speaking with confidence";
    return () => {
      document.title = previous;
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="lp nl">
      {/* ---------- Nav ---------- */}
      <header className={`nl-nav ${menuOpen ? "is-open" : ""}`}>
        <div className="lp-wrap nl-nav-inner">
          <a href="#top" className="nl-logo" aria-label="Loquiex home" onClick={closeMenu}>
            <img src={brandLogo} alt="Loquiex" />
          </a>
          <nav className="nl-nav-links" aria-label="Page sections">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="nl-nav-actions">
            {signedIn ? (
              <Link className="lp-btn lp-btn-sm" to="/app/home">
                Open app
              </Link>
            ) : (
              <>
                <Link className="nl-nav-login" to="/login">
                  Log in
                </Link>
                <Link className="lp-btn lp-btn-sm" to="/register">
                  Get started
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="nl-menu-btn"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menuOpen && (
          <div className="nl-menu">
            <div className="lp-wrap">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={closeMenu}>
                  {l.label}
                </a>
              ))}
              <div className="nl-menu-actions">
                {signedIn ? (
                  <Link className="lp-btn" to="/app/home">
                    Open app
                  </Link>
                ) : (
                  <>
                    <Link className="lp-btn" to="/register">
                      Get started
                    </Link>
                    <Link className="lp-btn lp-btn-ghost" to="/login">
                      Log in
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        {/* ---------- 1. Hero ---------- */}
        <section className="nl-hero">
          <div className="nl-hero-grid" aria-hidden="true" />
          <div className="lp-wrap nl-hero-inner">
            <span className="nl-pill">
              <span className="nl-pill-dot" aria-hidden="true" />
              Your voice has room to grow
            </span>
            <h1 className="nl-h1">
              You have so much to say.{" "}
              <span className="nl-h1-olive">Let's help you say it well.</span>
            </h1>
            <p className="nl-lead">
              A communication practice platform designed to help you organise
              your thoughts, express yourself clearly and build confidence
              through consistent practice.
            </p>
            <div className="nl-actions">
              <Link className="lp-btn" to={startTo}>
                Start practising
              </Link>
              <a className="lp-btn lp-btn-ghost nl-btn-outline" href="#how-it-works">
                Explore Loquiex <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <p className="nl-hero-note">
              <Mic size={15} aria-hidden="true" /> Think clearly. Speak freely.
              Grow consistently.
            </p>
            <PhoneVideo />
          </div>
        </section>

        {/* ---------- 2. Your journey with Loquiex ---------- */}
        <section className="nl-journey" id="how-it-works">
          <div className="lp-wrap">
            <div className="nl-journey-head">
              <h2 className="nl-h2">Your journey with Loquiex</h2>
              <p className="nl-journey-lead">
                A simple look at how you practise and develop your
                communication skills.
              </p>
            </div>
            <ol className="nl-steps">
              {JOURNEY.map((step) => (
                <li key={step.num} className="nl-step">
                  <span className="nl-step-num" aria-hidden="true">
                    {step.num}
                  </span>
                  <article className={`nl-step-card ${step.olive ? "is-olive" : ""}`}>
                    <p className="nl-step-eyebrow">{step.eyebrow}</p>
                    <h3 className="nl-step-title">{step.title}</h3>
                    <p className="nl-step-body">{step.body}</p>
                    <div className="nl-step-screen">
                      <img src={step.image} alt={step.alt} loading="lazy" />
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- 3. Made for your progress (old landing page) ---------- */}
        <section className="lp-section lp-light" id="platform">
          <div className="lp-wrap lp-narrow">
            <p className="lp-eyebrow">Made for your progress</p>
            <h2 className="lp-h2">Loquiex is for you if...</h2>
            <p className="lp-lead">
              Whether you're finding your voice in everyday conversations or
              developing your professional communication, there's room for you
              here.
            </p>
            <ul className="lp-bullets">
              {FOR_YOU.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- 4. Membership (old landing page) ---------- */}
        <section className="lp-section" id="plans">
          <div className="lp-wrap">
            <div className="lp-head">
              <p className="lp-eyebrow">Membership</p>
              <h2 className="lp-h2">Find the membership that works for you.</h2>
              <p className="lp-lead">
                Start with free practice or get more access to AI feedback and
                group practice with a paid membership.
              </p>
            </div>
            <div className="lp-plans">
              {PLANS.map((p) => (
                <article
                  key={p.id}
                  className={`lp-plan ${p.featured ? "lp-plan-featured" : ""} ${p.dark ? "lp-plan-dark" : ""}`}
                >
                  {p.pill && <span className="lp-pill lp-pill-sm">{p.pill}</span>}
                  <h3 className="lp-h4">{p.name}</h3>
                  <p className="lp-small">{p.tagline}</p>
                  <ul className="lp-plan-list lp-plan-bullets">
                    {p.features.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                  <Link className="lp-btn lp-btn-block" to={planTo}>
                    Explore plan
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 5. FAQs (old landing page) ---------- */}
        <section className="lp-section lp-light lp-faq-section" id="faqs">
          <div className="lp-wrap lp-narrow">
            <p className="lp-eyebrow">Need to know more?</p>
            <h2 className="lp-h2">Frequently asked questions.</h2>
            <div className="lp-faqs lp-faqs-open">
              {FAQS.map((f) => (
                <div key={f.q} className="lp-faq-item">
                  <h3 className="lp-h4">{f.q}</h3>
                  <p className="lp-body">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
