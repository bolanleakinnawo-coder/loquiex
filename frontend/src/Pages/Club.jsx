// Round 17 (Sheriff): the Club tab. Before the Club opens it shows Sheriff's
// "We're opening soon!" card with the opening date (data/club.js).
import { CalendarDays } from "lucide-react";
import { CLUB_OPENS_AT } from "../data/club";
import "../styles/Club.css";

const openingDay = new Date(CLUB_OPENS_AT)
  .toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" })
  .toUpperCase();

export default function Club() {
  return (
    <div className="learn-content club-page">
      <header className="learn-header">
        <h1 className="learn-title">Loquiex Club</h1>
        <p className="learn-subtitle">Many voices. One community.</p>
      </header>

      <div className="club-stage">
        <section className="club-card" aria-labelledby="club-soon-title">
          <CalendarDays className="club-card-icon" size={36} strokeWidth={1.6} aria-hidden="true" />
          <h2 id="club-soon-title" className="club-card-title">
            We&apos;re opening soon!
          </h2>
          <p className="club-card-date">
            <time dateTime={CLUB_OPENS_AT}>{openingDay}</time>
          </p>
          <p className="club-card-text">
            A community to stay accountable, find speaking partners and grow
            together.
          </p>
        </section>
      </div>
    </div>
  );
}
