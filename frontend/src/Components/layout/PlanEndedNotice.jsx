// Round 18 (Sheriff): a bar at the top of the app when a paid plan has
// ended. It never blocks anything. It shows until they renew; X hides it for
// that ended plan. Team Admins and members see their own wording.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleAlert, X } from "lucide-react";
import { PLANS, getPlanId, getStoredUser, isOnAiTrial } from "../../data/plans";
import { getMyTeam } from "../../lib/team";
import "../../styles/GroupCall.css";

const HIDE_KEY = "loquiex.planEndedHidden";

function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) || "";
  } catch {
    return "";
  }
}

export default function PlanEndedNotice() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [hidden, setHidden] = useState(readHidden);
  const [teamRole, setTeamRole] = useState(null);

  // The plan is refreshed from the server elsewhere; pick up the new copy.
  useEffect(() => {
    const refresh = () => setUser(getStoredUser());
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    const t = setInterval(refresh, 15000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      clearInterval(t);
    };
  }, []);

  const ended = user?.subscription?.endedPlan || null;
  const show =
    ended && getPlanId(user) === "free" && !isOnAiTrial(user) && hidden !== String(ended.endedAt);

  useEffect(() => {
    if (!show || !ended?.fromTeam) return;
    let alive = true;
    getMyTeam()
      .then((t) => alive && setTeamRole(t?.role || "member"))
      .catch(() => alive && setTeamRole("member"));
    return () => {
      alive = false;
    };
  }, [show, ended?.fromTeam]);

  if (!show) return null;
  if (ended.fromTeam && !teamRole) return null;

  const name = PLANS.find((p) => p.id === ended.planId)?.name || "plan";
  const admin = ended.fromTeam && teamRole === "admin";
  const title = ended.fromTeam
    ? `Your team's ${name} has ended.`
    : `Your ${name} has ended.`;
  const text = !ended.fromTeam
    ? "You're now on Loquiex Free. Renew any time to get everything back."
    : admin
      ? "Everyone in your team is now on Loquiex Free."
      : "You're now on Loquiex Free. Ask your Team Admin to renew it.";
  const canRenew = !ended.fromTeam || admin;

  const hide = () => {
    try {
      localStorage.setItem(HIDE_KEY, String(ended.endedAt));
    } catch {
      // Storage blocked: hidden until the page reloads.
    }
    setHidden(String(ended.endedAt));
  };

  return (
    <div className="callbar callbar--full verify-notice" role="status">
      <CircleAlert size={16} aria-hidden="true" />
      <div className="callbar-text">
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      {canRenew && (
        <button
          type="button"
          className="callbar-return"
          onClick={() => navigate("/app/membership")}
        >
          Renew
        </button>
      )}
      <button type="button" className="callbar-icon" onClick={hide} aria-label="Hide">
        <X size={16} />
      </button>
    </div>
  );
}
