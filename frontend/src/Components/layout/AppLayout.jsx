import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { autoEnablePush } from "../../lib/push";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import CallBar from "./CallBar";
import LearnNotice from "../learn/LearnNotice";
import PaymentSync from "./PaymentSync";
import VerifyEmailNotice from "./VerifyEmailNotice";
import PlanEndedNotice from "./PlanEndedNotice";

export default function AppLayout() {
  // Round 22 (Sheriff): phone reminders on by default (see lib/push.js).
  useEffect(() => {
    autoEnablePush();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <CallBar />
        <VerifyEmailNotice />
        <PlanEndedNotice />
        <LearnNotice />
        <PaymentSync />
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}
