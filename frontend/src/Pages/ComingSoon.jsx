// Round 17 (Sheriff): what visitors see at loquiex.app ("/"). Every other
// page (/login, /app/..., /landingpage, /admin) still opens directly.
// Wording is Sheriff's, word for word, in the Club card style.
import { CalendarDays } from "lucide-react";
import brandLogo from "../assets/landing/loquiex-logo.png";
import "../styles/Club.css";

export default function ComingSoon() {
  return (
    <main className="coming-soon-page">
      <img className="coming-soon-logo" src={brandLogo} alt="Loquiex" />
      <section className="club-card" aria-labelledby="coming-soon-title">
        <CalendarDays className="club-card-icon" size={36} strokeWidth={1.6} aria-hidden="true" />
        <h1 id="coming-soon-title" className="club-card-title">
          Something great is coming!
        </h1>
        <p className="club-card-date">
          <time dateTime="2026-11-28">28 NOV</time>
        </p>
        <p className="club-card-text">Loquiex is almost here.</p>
      </section>
    </main>
  );
}
