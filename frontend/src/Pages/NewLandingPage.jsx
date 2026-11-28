// Public landing page, route "/landingpage" (Sheriff, 2026-11-27 rework).
// Layout follows Sheriff's screen recording (screen-recordings/
// sheriff-screen-recording-2026-11-27.mov), centred. Hero, Membership, FAQs,
// final call to action and footer keep the wording of the previous version;
// the other sections use the recording's wording. Please don't reword it.
// Pictures are real Loquiex screens (assets/landing-app/), Sheriff 2026-11-27.
// The older landing page (Pages/LandingPage.jsx) is still kept, unrouted.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Menu,
  MessagesSquare,
  Plus,
  Trophy,
  Users,
  X,
} from "lucide-react";

import brandLogo from "../assets/landing/loquiex-logo.png";
import shotHome from "../assets/landing-app/home-desktop.webp";
import shotSolo from "../assets/landing-app/solo-practice-desktop.webp";
import shotFeedback from "../assets/landing-app/feedback-desktop.webp";
import shotCall from "../assets/landing-app/group-practice-desktop.webp";
import shotWord from "../assets/landing-app/word-of-the-day.webp";
import shotWin from "../assets/landing-app/share-a-win.webp";
import shotLeader from "../assets/landing-app/leaderboard.webp";
import shotProfile from "../assets/landing-app/your-stats-desktop.webp";
import { PLANS as APP_PLANS } from "../data/plans";
import "../styles/PublicLanding.css";
import "../styles/NewLanding.css";

const NAV_LINKS = [
  { label: "The platform", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Plans", href: "#plans" },
  { label: "FAQs", href: "#faqs" },
];

const MORE = [
  {
    tag: "Vocabulary",
    icon: BookOpen,
    name: "Word of the Day",
    image: shotWord,
    alt: "Word of the Day card: Articulate",
  },
  {
    tag: "Celebrate",
    icon: Trophy,
    name: "Share Your Win",
    image: shotWin,
    alt: "The Share a Win screen",
  },
  {
    tag: "Compete",
    icon: BarChart3,
    name: "Loquiex Leaderboard",
    image: shotLeader,
    alt: "The Loquiex Leaderboard",
  },
];

// Membership cards: today's plans from data/plans.js (same as Manage
// Membership), no prices, "Explore plan" on every card (Sheriff, 2026-11-26).
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
];

const FOOTER_SUPPORT = [
  { label: "FAQs", href: "#faqs" },
  { label: "Contact", href: "/app/help" },
  { label: "Privacy policy", href: "#privacy-policy" },
  { label: "Terms and conditions", href: "#terms-and-conditions" },
];

// Signed in on this device? (Storage can be blocked in private mode.)
function hasToken() {
  try {
    return Boolean(localStorage.getItem("token"));
  } catch {
    return false;
  }
}

function Faq({ q, a }) {
  return (
    <details className="nl-faq">
      <summary>
        {q}
        <Plus size={18} aria-hidden="true" />
      </summary>
      <p>{a}</p>
    </details>
  );
}

// One numbered step of "How Loquiex works". Cards alternate dark and sage
// green (olive). With a picture, the words sit left and the picture right on
// big screens; "wide" steps put their content under the words.
function Step({ id, n, olive, cream, wide, label, title, lead, picture, pictureAlt, children }) {
  const two = Boolean(picture) && !wide;
  return (
    <li id={id} className="nl-st" data-reveal>
      <span className="nl-st-num" aria-hidden="true">
        {n}
      </span>
      <div className={`nl-st-card${olive ? " is-olive" : ""}${cream ? " is-cream" : ""}${two ? " has-pic" : ""}`}>
        <div className="nl-st-words">
          <p className="nl-st-eyebrow">
            Step {n} · {label}
          </p>
          <h3 className="nl-st-title">{title}</h3>
          {lead && <p className="nl-st-lead">{lead}</p>}
          {two && children}
        </div>
        {picture && (
          <div className="nl-st-pic">
            <img src={picture} alt={pictureAlt} loading="lazy" />
          </div>
        )}
        {!two && children && <div className="nl-st-more">{children}</div>}
      </div>
    </li>
  );
}

// Adds "is-in" to every [data-reveal] element as it scrolls into view, so the
// steps animate in. Without IntersectionObserver everything simply shows.
function useReveal() {
  useEffect(() => {
    const root = document.querySelector(".nl");
    if (!root || typeof IntersectionObserver === "undefined") return undefined;
    root.classList.add("nl-anim");
    const items = root.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function NewLandingPage() {
  const signedIn = hasToken();
  const startTo = signedIn ? "/app/home" : "/register";
  const planTo = signedIn ? "/app/membership" : "/register";
  const [menuOpen, setMenuOpen] = useState(false);
  useReveal();

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
        {/* ---------- Hero ---------- */}
        <section className="nl-sec nl-hero">
          <div className="lp-wrap nl-two">
            <div className="nl-two-head">
            <span className="nl-pill">
              <span className="nl-pill-dot" aria-hidden="true" />
              Your voice has room to grow
            </span>
            <h1 className="nl-h1">
              <span>You have so much to say.</span>
              <span className="nl-h1-olive">Let's help you say it well.</span>
            </h1>
            <p className="nl-lead nl-hero-lead">
              Build your communication skills through consistent speaking
              practice, personalised feedback, and everyday learning.
            </p>
            <Link className="lp-btn nl-hero-btn" to={startTo}>
              Start practising <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            </div>
            <div className="nl-shot-wide">
              <img src={shotHome} alt="The Loquiex Home screen: today's practice, word of the day and recent practices" />
            </div>
          </div>
        </section>

        {/* ---------- The Loquiex experience ---------- */}
        <section className="nl-sec nl-cream" id="platform">
          <div className="lp-wrap nl-head">
            <p className="nl-eyebrow">The Loquiex experience</p>
            <h2 className="nl-h2">
              So, how do you actually become a better communicator?
            </h2>
            <p className="nl-lead">
              You learn, you practise, you make mistakes, you get feedback and
              you keep going. Loquiex gives you the tools and opportunities to do
              just that.
            </p>
          </div>
        </section>

        {/* ---------- How Loquiex works: 01 to 08 as numbered steps ----------
            Follows the "Your journey with Loquiex" design (Sheriff,
            2026-11-28): numbered circles on a line, cards alternating dark
            and sage green, each one animating in as it scrolls into view. */}
        <section className="nl-sec nl-how" id="how-it-works">
          <div className="lp-wrap">
            <div className="nl-how-head" data-reveal>
              <h2 className="nl-h2">How Loquiex works</h2>
              <p className="nl-lead">
                Explore the different ways to practice, learn and develop your
                communication skills on Loquiex.
              </p>
            </div>

            <ol className="nl-steps2">
              <Step
                n="01"
                label="Solo practice"
                title="Make speaking a regular practice."
                lead="Explore different ways to practise, challenge your thinking and become more comfortable expressing yourself."
                picture={shotSolo}
                pictureAlt="Practice Time in Loquiex: Spin the Jar, Research Mode and Yap Mode"
              >
                <div className="nl-list">
                  <div className="nl-item">
                    <span className="nl-ic">
                      <MessagesSquare size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <b>Yap Mode</b>
                      <span className="nl-meta">
                        Speak freely and explore your thoughts without a fixed topic.
                      </span>
                    </div>
                  </div>
                  <div className="nl-item">
                    <span className="nl-ic">
                      <BookOpen size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <b>Research Mode</b>
                      <span className="nl-meta">
                        Explore a subject, develop your understanding and practise
                        explaining what you've learned.
                      </span>
                    </div>
                  </div>
                </div>
              </Step>

              <Step
                n="02"
                olive
                label="Speaking feedback"
                title="Your speaking session shouldn't end when you stop talking."
                lead="Understand what you did well, identify what needs work and know what to focus on in your next session."
                picture={shotFeedback}
                pictureAlt="Here's how you did: a Loquiex feedback report with the overall speaking score"
              />

              <Step
                n="03"
                label="Group practice"
                title="Better conversations happen together."
                lead="Practise with other people, exchange perspectives and learn to express yourself in a group setting."
                picture={shotCall}
                pictureAlt="Practice Together: Loquiex group practice with live calls"
              />

              <Step
                n="04"
                olive
                wide
                label="More to explore"
                title="There's more to Loquiex than speaking practice."
                lead="Discover more ways to learn, celebrate your progress and connect with the Loquiex community."
              >
                <div className="nl-grid3">
                  {MORE.map(({ tag, icon: Icon, name, image, alt }, i) => (
                    <article
                      key={name}
                      className="nl-mini"
                      data-reveal
                      style={{ "--d": `${i * 120}ms` }}
                    >
                      <div className="nl-row">
                        <span className="nl-chip-tag">{tag}</span>
                        <Icon size={18} className="nl-olive" aria-hidden="true" />
                      </div>
                      <p className="nl-mini-name">{name}</p>
                      <div className="nl-mini-shot">
                        <img src={image} alt={alt} loading="lazy" />
                      </div>
                    </article>
                  ))}
                </div>
              </Step>

              <Step
                n="05"
                label="Your profile"
                title="Your progress, all in one place."
                lead="Keep track of your speaking activity, practice history and the work you're putting into becoming a better communicator."
                picture={shotProfile}
                pictureAlt="Your Stats in Loquiex: practices completed, speaking time, streak and practice activity"
              />

              <Step
                id="plans"
                n="06"
                olive
                wide
                label="Membership"
                title="Find the membership that works for you."
                lead="Start with free practice or get more access to AI feedback and group practice with a paid membership."
              >
                <div className="lp-plans nl-plans">
                  {PLANS.map((p, i) => (
                    <article
                      key={p.id}
                      className={`lp-plan ${p.featured ? "lp-plan-featured" : ""} ${p.dark ? "lp-plan-dark" : ""}`}
                      data-reveal
                      style={{ "--d": `${i * 100}ms` }}
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
              </Step>

              <Step
                n="07"
                label="Coming soon"
                title="We're building more for you."
                lead="More opportunities to learn and grow as a communicator are on the way."
              >
                <div className="nl-list">
                  <div className="nl-item">
                    <span className="nl-ic">
                      <BookOpen size={20} aria-hidden="true" />
                    </span>
                    <div className="nl-grow">
                      <b>Loquiex Learn</b>
                      <span className="nl-meta">Communication learning resources.</span>
                    </div>
                    <span className="nl-soon">Soon</span>
                  </div>
                  <div className="nl-item">
                    <span className="nl-ic">
                      <Users size={20} aria-hidden="true" />
                    </span>
                    <div className="nl-grow">
                      <b>Loquiex Club</b>
                      <span className="nl-meta">
                        A community of people committed to better communication.
                      </span>
                    </div>
                    <span className="nl-soon">Soon</span>
                  </div>
                </div>
              </Step>

              <Step id="faqs" n="08" cream wide label="FAQ" title="Frequently asked questions.">
                <div className="nl-faqs">
                  {FAQS.map((f) => (
                    <Faq key={f.q} q={f.q} a={f.a} />
                  ))}
                </div>
              </Step>
            </ol>
          </div>
        </section>

        {/* ---------- Final call to action (old landing page) ---------- */}
        <section className="lp-section lp-final nl-final">
          <div className="lp-wrap lp-narrow">
            <h2 className="lp-h2">Ready to give your voice room to grow?</h2>
            <p className="lp-lead">
              You have something to say. Start practising, find your words and
              become more confident expressing yourself.
            </p>
            <Link className="lp-btn lp-btn-block" to={startTo}>
              Create your free account
            </Link>
            <Link className="lp-more" to={signedIn ? "/app/home" : "/login"}>
              Already a member? Log in <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* ---------- Footer (old landing page) ---------- */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-top">
            <div>
              <a href="#top" className="lp-logo" aria-label="Loquiex home">
                <img src={brandLogo} alt="Loquiex" />
              </a>
              <p className="lp-small">Learn it. Practise it. Use it.</p>
            </div>
            <div className="lp-footer-cols">
              <div>
                <p className="lp-footer-title">Explore</p>
                <a href="#platform">The platform</a>
                <a href="#plans">Membership plans</a>
                <Link to={signedIn ? "/app/home" : "/login"}>Dashboard</Link>
              </div>
              <div>
                <p className="lp-footer-title">Support</p>
                {FOOTER_SUPPORT.map((l) => (
                  <a key={l.label} href={l.href}>
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <p className="lp-footer-copy">
            © {new Date().getFullYear()} Loquiex. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
