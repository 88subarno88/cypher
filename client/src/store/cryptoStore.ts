// ── WHAT TO DO IN THIS FILE ON DAY 3 ─────────────────────
// You updated this file on Day 2 to uncomment encryption,
// decryption, and signing exports.
// On Day 3 you add one more: keyDerivation.
//
// ── WHAT TO CHANGE ────────────────────────────────────────
// Find this line (currently commented):
//   // export * from "./keyDerivation";  ← Day 3 (still commented)
//
// Remove the // so it becomes:
//   export * from "./keyDerivation";
//
// ── AFTER THE CHANGE the file should look like: ───────────
//
//   export * from "./keyManagement";   ← Day 1 ✓
//   export * from "./encryption";      ← Day 2 ✓
//   export * from "./decryption";      ← Day 2 ✓
//   export * from "./signing";         ← Day 2 ✓
//   export * from "./keyDerivation";   ← Day 3 (uncomment now)
//
// ── VERIFY ────────────────────────────────────────────────
// Run: npx tsc --noEmit  (from inside client/)
// Zero errors = keyDerivation.ts exports are resolving correctly.
// If you see "has no exported member 'deriveKeyFromPassword'",
// check that the function has the "export" keyword in keyDerivation.ts.