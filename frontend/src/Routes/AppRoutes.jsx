import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// The previous landing page (Pages/LandingPage.jsx) is kept but not routed
// (Sheriff, 2026-11-26). "/landingpage" shows the new one.
import NewLandingPage from "../Pages/NewLandingPage";
import ComingSoon from "../Pages/ComingSoon";
import AppLayout from "../Components/layout/AppLayout";
import Home from "../Pages/Home";
import Practice from "../Pages/Practice";
import Challenges from "../Pages/Challenges";
import Learn from "../Pages/Learn";
import Club from "../Pages/Club";
import Library from "../Pages/Library";
import Profile from "../Pages/Profile";
import AdminTestimonials from "../Pages/AdminTestimonials";
import AdminOverview from "../Pages/AdminOverview";
import AdminSubscribers from "../Pages/AdminSubscribers";
import AdminPayments from "../Pages/AdminPayments";
import AdminProductNotifications from "../Pages/AdminProductNotifications";
import AdminLayout from "../Components/layout/AdminLayout";
import AdminNotifications from "../Pages/AdminNotifications";
import AdminEmails from "../Pages/AdminEmails";
import {
  AdminGroupAnalytics,
  AdminLearnAnalytics,
  AdminPracticeAnalytics,
  AdminSubscriptions,
} from "../Pages/AdminDashboard";
import Registration from "../Pages/Registration";
import Login from "../Pages/Login";
import ForgotPassword from "../Pages/ForgotPassword";
import ResetPassword from "../Pages/ResetPassword";
import VerifyEmail from "../Pages/VerifyEmail";
import ProtectedRoute from "./ProtectedRoute";

import PracticeSession from "../Pages/PracticeSession";
import WelcomeIntro from "../Pages/WelcomeIntro"; // NEW
import ReadyIntro from "../Pages/ReadyIntro"; // NEW
import Waitlist from "../Pages/Waitlist";
import Membership from "../Pages/Membership";
import TeamJoin from "../Pages/TeamJoin";
import MyTeam from "../Pages/MyTeam";
import { useParams } from "react-router-dom";

// Old invite links (/app/team/join/CODE) go to the public invite page.
function OldTeamInvite() {
  const { code } = useParams();
  return <Navigate to={`/team/join/${code}`} replace />;
}
import HelpSupport from "../Pages/HelpSupport";
import {
  GroupPracticeIntro,
  GroupPracticeRoom,
  GroupPracticeStart,
  GroupPracticeCall,
  GroupPracticeJoin,
} from "../Pages/GroupPractice";

// The book reader brings in the PDF library, so it only loads when opened.
const BookReader = lazy(() => import("../Pages/BookReader"));

export default function AppRoutes() {
  return (
    <Routes>
      {/* Round 17 (Sheriff): loquiex.app shows the coming soon page. Other
          pages still open directly (/login, /app/home, /landingpage, /admin). */}
      <Route path="/" element={<ComingSoon />} />
      <Route path="/landingpage" element={<NewLandingPage />} />
      <Route path="/welcome" element={<WelcomeIntro />} /> {/* NEW */}
      <Route path="/register" element={<Registration />} />
      <Route path="/ready" element={<ReadyIntro />} /> {/* NEW */}
      <Route path="/waitlist" element={<Waitlist />} />
      <Route path="/login" element={<Login />} />
      <Route path="/team/join/:code" element={<TeamJoin />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Round 17: the link in the "Verify your email" email. */}
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="testimonials" element={<AdminTestimonials />} />
        <Route path="subscribers" element={<AdminSubscribers />} />
        <Route path="payments" element={<AdminPayments />} />
        {/* Round 14 (Sheriff): dashboard sections. */}
        <Route path="practice" element={<AdminPracticeAnalytics />} />
        <Route path="learn-analytics" element={<AdminLearnAnalytics />} />
        <Route path="group-practice" element={<AdminGroupAnalytics />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="emails" element={<AdminEmails />} />
        <Route
          path="product-notifications"
          element={<AdminProductNotifications />}
        />
        <Route
          path="waitlist"
          element={<Navigate to="/admin/product-notifications" replace />}
        />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="practice" element={<Practice />} />
          <Route path="challenges" element={<Challenges />} />
          <Route path="library" element={<Library />} />
          <Route path="profile" element={<Profile />} />
          <Route path="club" element={<Club />} />
          <Route path="learn" element={<Learn />} />
          <Route
            path="learn/read/:bookId"
            element={
              <Suspense fallback={null}>
                <BookReader />
              </Suspense>
            }
          />

          <Route path="practice/prepare" element={<PracticeSession />} />
          <Route path="practice/yap-session" element={<PracticeSession />} />
          <Route
            path="practice/research-session"
            element={<PracticeSession />}
          />
          <Route path="membership" element={<Membership />} />
          <Route path="team" element={<MyTeam />} />
          <Route path="team/join/:code" element={<OldTeamInvite />} />
          <Route path="help" element={<HelpSupport />} />
          <Route path="group-practice" element={<GroupPracticeIntro />} />
          <Route path="group-practice/room" element={<GroupPracticeRoom />} />
          <Route path="group-practice/start" element={<GroupPracticeStart />} />
          <Route
            path="group-practice/room/:roomId"
            element={<GroupPracticeCall />}
          />
          <Route path="group-practice/join" element={<GroupPracticeJoin />} />
          <Route
            path="group-practice/join/:code"
            element={<GroupPracticeJoin />}
          />
        </Route>
      </Route>
    </Routes>
  );
}
