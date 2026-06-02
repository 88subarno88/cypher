// ── WHAT IS THIS FILE? ────────────────────────────────────
// The root component. Defines all routes and wraps protected
// routes in an auth guard that redirects unauthenticated users
// to /login.
//
// ── RESOURCES TO READ FIRST ───────────────────────────────
// React Router v6 — defining routes:
//   https://reactrouter.com/en/main/components/routes
// Read: Routes, Route, Navigate components.
// Focus on: how to nest routes, how Navigate works for redirects.
//
// ── WHAT TO WRITE ─────────────────────────────────────────
//
// IMPORTS YOU NEED:
import { Routes, Route, Navigate } from "react-router-dom";
import { useMyStore } from "./store/authStore";
import Register from "./pages/register";
import Login from "./pages/login";
import Chat from "./pages/chat";

//
// ── PART 1: Write a ProtectedRoute component ──────────────
// A ProtectedRoute is a small wrapper component that checks if
// the user is logged in. If yes, it renders its children.
// If no, it redirects to /login.
//
// How to write it:
function ProtectedRoute({ children}: { children: React.ReactNode }) {
  const token = useMyStore((s) => s.getAccessToken());
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
//
//   → useAuthStore reads the token from the auth store (Day 3)
//   → getAccessToken() checks state AND localStorage
//   → If no token: <Navigate to="/login" replace /> redirects immediately
//   → "replace" means the /chat URL is replaced in history (not added)
//     so the user cannot press Back to get to /chat without logging in
//   → If there IS a token: render children (whatever is inside)
//
// ── PART 2: Write the App component with Routes ───────────
export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
//
// ── WHAT EACH ROUTE DOES ──────────────────────────────────
// /login    → shows Login page (always accessible)
// /register → shows Register page (always accessible)
// /chat     → wrapped in ProtectedRoute — redirects to /login if no token
// /         → root URL redirects to /login automatically
//
// ── END-OF-DAY TEST FOR THIS FILE ────────────────────────
// 1. Visit localhost:5173/chat WITHOUT being logged in
//    → Must redirect to /login automatically
// 2. Visit localhost:5173/login
//    → Must show the Login page
// 3. Visit localhost:5173/register
//    → Must show the Register page
// If any redirect does not work, getAccessToken() in authStore
// is not reading localStorage correctly.
//
// ── COMMON MISTAKES ───────────────────────────────────────
// ✗ Using <Redirect> instead of <Navigate>
//   → Redirect was React Router v5. v6 uses Navigate.
//
// ✗ Forgetting "replace" on Navigate
//   → Without replace, pressing Back after redirect goes to /chat
//     which immediately redirects again — infinite loop in history
