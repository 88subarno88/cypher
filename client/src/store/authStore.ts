// ── WHAT IS THIS FILE? ────────────────────────────────────
// A Zustand store that holds JWT tokens and the logged-in user's profile.
// On Day 3 this is a STUB — the shape and actions are defined but
// not yet wired to real API calls. Those come on Day 6.
//
// ── WHAT IS ZUSTAND? ──────────────────────────────────────
// Zustand is a lightweight state management library for React.
// Instead of useState scattered across components, you define
// a store (a plain object with state and functions) once,
// and any component can read or update it.
//
// Basic Zustand pattern:
//   import { create } from "zustand"
//
//   const useMyStore = create<MyState>((set) => ({
//     value: 0,
//     increment: () => set((state) => ({ value: state.value + 1 })),
//   }))
//
//   In a component: const value = useMyStore((s) => s.value)
//
// ── RESOURCES TO READ FIRST ───────────────────────────────
// Zustand getting started:
//   https://docs.pmnd.rs/zustand/getting-started/introduction
// Read: basic example, then the "Slices pattern" section.
// IMPORTANT: Also read the "Persist" section — then do NOT use it
// for authStore's token storage (use localStorage manually instead
// so you control exactly what gets stored and when).
//
// ── WHAT TYPE TO DEFINE ───────────────────────────────────
// Define an interface for the store's shape. Call it AuthState.
// It needs these fields and methods:
//
// STATE FIELDS:
//   accessToken: string | null
//     → The JWT access token (short-lived, 15 min)
//     → null when not logged in
//     → Used in the Axios interceptor as: Authorization: Bearer <accessToken>
//
//   refreshToken: string | null
//     → The JWT refresh token (longer-lived, 7 days)
//     → null when not logged in
//     → Used to get a new accessToken when it expires
//
//   user: { id: string; username: string } | null
//     → The logged-in user's profile
//     → null when not logged in
//     → Import UserProfile from "@cipher/shared" if you prefer
//
// ACTIONS (functions that update state):
//   setTokens(accessToken: string, refreshToken: string): void
//     → Called after a successful login
//     → Stores both tokens in state
//     → ALSO store the accessToken in localStorage so it survives
//       a page refresh:
//         localStorage.setItem("accessToken", accessToken)
//       The refresh token should NOT go in localStorage — keep it in memory only
//       (too sensitive for localStorage in a security-focused app)
//
//   setUser(user: { id: string; username: string }): void
//     → Called after login with the user profile from the server response
//
//   logout(): void
//     → Clears accessToken, refreshToken, and user from state
//     → Removes accessToken from localStorage:
//         localStorage.removeItem("accessToken")
//     → On Day 3 this is a simple state clear
//     → On Day 9 you will also add: call the server's /auth/logout
//       endpoint to blocklist the refresh token in Redis
//
//   getAccessToken(): string | null
//     → Reads from state AND falls back to localStorage:
//         return state.accessToken ?? localStorage.getItem("accessToken")
//     → Used by the Axios interceptor (Day 6) to attach the bearer token
//
// ── HOW TO WRITE THE STORE ────────────────────────────────
// Use create<AuthState>() from zustand.
// In the initializer function, return:
//   → All state fields set to null
//   → All action functions using the set() callback
//
// Pattern for actions that update state:
//   setTokens: (accessToken, refreshToken) =>
//     set({ accessToken, refreshToken })
//
// Pattern for actions that also have side effects (like localStorage):
//   logout: () => {
//     localStorage.removeItem("accessToken")
//     set({ accessToken: null, refreshToken: null, user: null })
//   }
//
// ── EXPORT ────────────────────────────────────────────────
// Export the hook as a named export:
//   export const useAuthStore = create<AuthState>()(...)
//
// Usage in components (Day 6 onward):
//   const { setTokens, logout } = useAuthStore()
//   const user = useAuthStore((s) => s.user)
//
// ── IMPORTANT: NO PERSIST MIDDLEWARE FOR TOKENS ───────────
// Do NOT wrap this store with Zustand's persist() middleware.
// Instead, manually handle localStorage for just the accessToken.
// This gives you explicit control over what is stored and when.
// The persist middleware is an all-or-nothing solution — it would
// store everything including sensitive fields you might add later.
//
// ── STUB NOTE ─────────────────────────────────────────────
// On Day 3 this store is a stub. The setTokens and setUser actions
// are defined but nothing calls them yet.
// On Day 6 you wire them to the real /auth/login response.