// Public landing page, route "/landingpage" (Sheriff, 2026-11-27 rework).
// Layout follows Sheriff's screen recording (screen-recordings/
// sheriff-screen-recording-2026-11-27.mov), centred. Hero, Membership, FAQs,
// final call to action and footer keep the wording of the previous version;
// the other sections use the recording's wording. Please don't reword it.
// The older landing page (Pages/LandingPage.jsx) is still kept, unrouted.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Flame,
  Menu,
  MessagesSquare,
  Mic,
  Plus,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";

import brandLogo from "../assets/landing/loquiex-logo.png";
import { PLANS as APP_PLANS } from "../data/plans";
import "../styles/PublicLanding.css";
import "../styles/NewLanding.css";

const NAV_LINKS = [
  { label: "The platform", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Plans", href: "#plans" },
  { label: "FAQs", href: "#faqs" },
];

const JAR_CATEGORIES =
  "Opinions & Arguments · Storytelling · Real Conversations · Explain Clearly · Analogy · One Word";

const FEEDBACK_AREAS = ["Clarity", "Fillers", "Grammar", "Pace", "Pauses", "Organisation"];

const MORE = [
  {
    tag: "Learn",
    icon: BookOpen,
    name: "Word of the Day",
    title: "Articulate",
    body: "Learn a new word every day and expand your vocabulary.",
    big: true,
  },
  {
    tag: "Celebrate",
    icon: Trophy,
    name: "Share Your Win",
    title: "Your wins deserve to be shared.",
    body: "Share your communication wins and celebrate your progress with the community.",
  },
  {
    tag: "Compete",
    icon: BarChart3,
    name: "Loquiex Leaderboard",
    title: "A little friendly competition.",
    body: "See how members are participating and find your place on the leaderboard.",
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

function SectionHead({ tag, title, lead }) {
  return (
    <div className="nl-head">
      <span className="nl-tag">{tag}</span>
      <h2 className="nl-h2">{title}</h2>
      {lead && <p className="nl-lead">{lead}</p>}
    </div>
  );
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
        {/* ---------- Hero ---------- */}
        <section className="nl-sec nl-hero">
          <div className="lp-wrap">
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

            <div className="nl-card nl-space">
              <div className="nl-row">
                <span className="nl-cap">Your practice space</span>
                <span className="nl-live">Live preview</span>
              </div>
              <div className="nl-panel">
                <span className="nl-cap">Today's topic</span>
                <h3 className="nl-panel-title">
                  Is being understood more important than being impressive?
                </h3>
                <div className="nl-row nl-meta">
                  <span>Opinions &amp; Arguments</span>
                  <span>Level 2</span>
                </div>
                <div className="nl-row nl-split">
                  <span>Your speaking session</span>
                  <Mic size={17} aria-hidden="true" />
                </div>
              </div>
              <p className="nl-hint">
                <Sparkles size={15} aria-hidden="true" /> Pick a topic. Speak. Get
                better.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- The Loquiex experience ---------- */}
        <section className="nl-sec nl-alt" id="platform">
          <div className="lp-wrap nl-head">
            <p className="nl-eyebrow">The Loquiex experience</p>
            <h2 className="nl-h2">
              Good communication takes more than knowing the right words.
            </h2>
            <p className="nl-lead">
              It's about organising your thoughts, expressing them clearly and
              knowing how to communicate in different situations.
            </p>
          </div>
        </section>

        {/* ---------- 01 Solo practice ---------- */}
        <section className="nl-sec" id="how-it-works">
          <div className="lp-wrap">
            <SectionHead
              tag="01 · Solo practice"
              title="Make speaking a regular practice."
              lead="Explore different ways to practise, challenge your thinking and become more comfortable expressing yourself."
            />
            <div className="nl-card">
              <div className="nl-row">
                <span className="nl-sig">The signature feature</span>
                <Sparkles size={18} className="nl-olive" aria-hidden="true" />
              </div>
              <h3 className="nl-card-title">Spin the Jar</h3>
              <p className="nl-meta">Let the jar pick your next speaking topic.</p>
              <div className="nl-jar">
                <div className="nl-disc">
                  <Shuffle size={26} aria-hidden="true" />
                  <span>Spin the jar</span>
                </div>
                <h4>What will you speak about?</h4>
                <p className="nl-meta">Choose a category and difficulty level.</p>
                <Link className="lp-btn nl-btn-light" to={startTo}>
                  Spin the jar
                </Link>
              </div>
              <p className="nl-meta nl-cats">{JAR_CATEGORIES}</p>
            </div>
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
          </div>
        </section>

        {/* ---------- 02 Speaking feedback ---------- */}
        <section className="nl-sec nl-alt">
          <div className="lp-wrap">
            <SectionHead
              tag="02 · Speaking feedback"
              title="Your speaking session shouldn't end when you stop talking."
              lead="Understand what you did well, identify what needs work and know what to focus on in your next session."
            />
            <div className="nl-card">
              <div className="nl-row">
                <span className="nl-cap">Session feedback</span>
                <span className="nl-live">Completed</span>
              </div>
              <div className="nl-score">
                <div className="nl-ring">
                  72<small>/100</small>
                </div>
                <div>
                  <b>Your speaking score</b>
                  <p className="nl-meta">A breakdown of your communication in this session.</p>
                </div>
              </div>
              <p className="nl-sub">Explore your feedback</p>
              <div className="nl-chips">
                {FEEDBACK_AREAS.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <div className="nl-box">
                <p className="nl-cap nl-olive">What you did well</p>
                You introduced your main point early and supported it with a
                relevant example.
              </div>
              <div className="nl-box">
                <p className="nl-cap nl-olive">Your next focus</p>
                Reduce repeated filler words and connect your ideas more smoothly.
              </div>
              <p className="nl-meta nl-note">
                Transcript and detailed feedback available after your session.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- 03 Group practice ---------- */}
        <section className="nl-sec">
          <div className="lp-wrap">
            <SectionHead
              tag="03 · Group practice"
              title="Better conversations happen together."
              lead="Practise with other people, exchange perspectives and learn to express yourself in a group setting."
            />
            <div className="nl-card">
              <div className="nl-row">
                <h3 className="nl-card-title nl-m0">Conversation Room</h3>
                <Users size={18} className="nl-olive" aria-hidden="true" />
              </div>
              <div className="nl-panel">
                <span className="nl-cap">Group discussion topic</span>
                <h3 className="nl-panel-title">
                  Can you disagree with someone and still respect their opinion?
                </h3>
                <div className="nl-row nl-split nl-meta">
                  <span>Speak. Listen. Exchange ideas.</span>
                  <MessagesSquare size={17} aria-hidden="true" />
                </div>
              </div>
              <Link className="lp-btn nl-card-btn" to={startTo}>
                Explore group practice
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- 04 More to explore ---------- */}
        <section className="nl-sec nl-alt">
          <div className="lp-wrap">
            <SectionHead
              tag="04 · More to explore"
              title="There's more to Loquiex than speaking practice."
              lead="Discover more ways to learn, celebrate your progress and connect with the Loquiex community."
            />
            <div className="nl-grid3">
              {MORE.map(({ tag, icon: Icon, name, title, body, big }) => (
                <article key={name} className="nl-mini">
                  <div className="nl-row">
                    <span className="nl-chip-tag">{tag}</span>
                    <Icon size={18} className="nl-olive" aria-hidden="true" />
                  </div>
                  <p className="nl-mini-name">{name}</p>
                  <h3 className={big ? "nl-mini-big" : "nl-mini-title"}>{title}</h3>
                  <p className="nl-meta">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 05 Your profile ---------- */}
        <section className="nl-sec">
          <div className="lp-wrap">
            <SectionHead
              tag="05 · Your profile"
              title="Your progress, all in one place."
              lead="Keep track of your speaking activity, practice history and the work you're putting into becoming a better communicator."
            />
            <div className="nl-card">
              <div className="nl-row nl-prof-head">
                <span className="nl-ic nl-ic-round">
                  <User size={22} aria-hidden="true" />
                </span>
                <div className="nl-grow">
                  <b>Your profile</b>
                  <p className="nl-meta">Your communication progress</p>
                </div>
                <SlidersHorizontal size={18} className="nl-soft" aria-hidden="true" />
              </div>
              <div className="nl-tiles">
                <div className="nl-tile">
                  <Mic size={18} aria-hidden="true" />
                  <span>Speaking activity</span>
                  <b>Practice history</b>
                </div>
                <div className="nl-tile">
                  <Flame size={18} aria-hidden="true" />
                  <span>Your consistency</span>
                  <b>Practice streak</b>
                </div>
              </div>
              <div className="nl-panel nl-hist">
                <span className="nl-cap">Your practice history</span>
                <div className="nl-row nl-split">
                  <span>Solo practice</span>
                  <ArrowUpRight size={16} className="nl-olive" aria-hidden="true" />
                </div>
                <div className="nl-row nl-split">
                  <span>Group practice</span>
                  <ArrowUpRight size={16} className="nl-olive" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 06 Membership ---------- */}
        <section className="nl-sec nl-alt" id="plans">
          <div className="lp-wrap">
            <SectionHead
              tag="06 · Membership"
              title="Find the membership that works for you."
              lead="Start with free practice or get more access to AI feedback and group practice with a paid membership."
            />
            <div className="lp-plans nl-plans">
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

        {/* ---------- 07 Coming soon ---------- */}
        <section className="nl-sec">
          <div className="lp-wrap">
            <SectionHead
              tag="07 · Coming soon"
              title="We're building more for you."
              lead="More opportunities to learn and grow as a communicator are on the way."
            />
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
          </div>
        </section>

        {/* ---------- 08 FAQs ---------- */}
        <section className="nl-sec nl-alt" id="faqs">
          <div className="lp-wrap">
            <SectionHead tag="08 · FAQ" title="Frequently asked questions." />
            <div className="nl-faqs">
              {FAQS.map((f) => (
                <Faq key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
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
