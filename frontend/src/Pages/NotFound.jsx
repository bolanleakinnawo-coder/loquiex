// Round 22 (Sheriff): any address that isn't a Loquiex page shows this
// plain "Page not found" page, in the Home tab colours and font.
import { Link } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found-card">
        <p className="not-found-code">404</p>
        <h1>Page not found</h1>
        <p className="not-found-text">This page doesn&apos;t exist or has moved.</p>
        <Link to="/app/home" className="primary-button not-found-btn">
          Go to Home
        </Link>
      </div>
    </main>
  );
}
