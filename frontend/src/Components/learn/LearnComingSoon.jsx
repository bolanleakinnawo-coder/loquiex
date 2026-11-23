// Learn tab before launch: a coming soon card with LEARN_LAUNCH_AT's date
// (19 DEC, 3 weeks from 28 Nov). When that passes, onLaunch() swaps in the shop without a reload.
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { LEARN_LAUNCH_AT } from "../../data/learn";
import { getStoredUser } from "../../data/plans";
import "../../styles/Club.css";

const LAUNCH_MS = new Date(LEARN_LAUNCH_AT).getTime();

export default function LearnComingSoon({ onLaunch }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = LAUNCH_MS - now;
  useEffect(() => {
    if (left <= 0) onLaunch();
  }, [left, onLaunch]);

  // Round 18 (Sheriff's mockup): their first name, from their full name.
  const first = (getStoredUser()?.fullName || "").trim().split(/\s+/)[0] || "";
  const firstName = first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
  // Round 18 (Sheriff): same card as the Club tab, with the launch date.
  const launchDay = new Date(LAUNCH_MS)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" })
    .toUpperCase();

  return (
    <div className="learn-content club-page">
      <header className="learn-header">
        <h1 className="learn-title">Learn</h1>
        <p className="learn-subtitle">
          Build the skills to communicate better.
        </p>
      </header>

      <div className="club-stage">
        <section className="club-card" aria-labelledby="lx-cs-title">
          <BookOpen className="club-card-icon" size={36} strokeWidth={1.6} aria-hidden="true" />
          <h2 id="lx-cs-title" className="club-card-title">
            Something is coming!
          </h2>
          <p className="club-card-date">
            <time dateTime={LEARN_LAUNCH_AT}>{launchDay}</time>
          </p>
          <p className="club-card-text">
            There&apos;s a lot to learn about communication
            {firstName ? `, ${firstName}` : ""}. And we&apos;re bringing some of
            it right here.
          </p>
        </section>
      </div>
    </div>
  );
}
