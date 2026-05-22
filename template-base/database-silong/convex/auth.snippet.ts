// ============================================================================
// auth.snippet.ts — @convex-dev/auth minimal Google OAuth reference
// ============================================================================
//
// HOW TO USE
//   1. `pnpm add @convex-dev/auth @auth/core`
//   2. Copy this file to `convex/auth.ts` (drop the `.snippet` suffix).
//   3. Set the required env vars (see ENV below).
//   4. Run `npx convex codegen` then `npx convex deploy`.
//
// This is a SNIPPET, not runnable as-is until you rename and wire env vars.
//
// WHAT'S CUSTOMISABLE
//   - `providers: [...]`  — swap/add Google, GitHub, Apple, Password, Resend OTP,
//                           passkeys, etc. Each provider has its own env vars.
//   - OAuth scopes        — pass `authorization: { params: { scope: "..." } }`
//                           inside the provider call to widen scopes.
//   - Profile mapping     — pass `profile(profile) { return {...} }` to control
//                           which fields land in your `users` table row.
//
// ENV VARS (set on your Convex deployment — `npx convex env set KEY value`)
//   JWT_PRIVATE_KEY     — PEM-encoded RSA private key (sign session JWTs)
//   JWKS                — public JWKS JSON string (verify session JWTs)
//   SITE_URL            — your frontend origin, e.g. https://app.example.com
//                         (used for OAuth callback redirects)
//   AUTH_GOOGLE_ID      — Google OAuth client id (from Google Cloud Console)
//   AUTH_GOOGLE_SECRET  — Google OAuth client secret
//
//   Generate JWT_PRIVATE_KEY + JWKS:
//     openssl genrsa -out private.pem 2048
//     # Then convert to JWKS via:
//     #   node -e "/* see https://labs.convex.dev/auth/setup#jwt */"
//
// ADVANCED SETUP — for password hashing, magic links, multi-provider linking,
// custom user bootstrap (e.g. auto-create workspace on first sign-in), and
// passkeys, see open-silong's production reference:
//   https://github.com/rahmanef63/open-silong/blob/main/convex/auth.ts
//
// OTHER PROVIDERS (see @convex-dev/auth docs for each):
//   - GitHub:     `import GitHub from "@auth/core/providers/github"`
//                 env: AUTH_GITHUB_ID, AUTH_GITHUB_SECRET
//   - Email link: `import Resend from "@auth/core/providers/resend"`
//                 env: AUTH_RESEND_KEY, AUTH_EMAIL_FROM
//   - Password:   `import { Password } from "@convex-dev/auth/providers/Password"`
//                 (see open-silong reference for PBKDF2 hash recipe)
//   - Passkeys:   see https://labs.convex.dev/auth/config/passkeys
//
// DOCS — https://labs.convex.dev/auth
// ============================================================================

import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Minimal Google OAuth. Add more providers to this array as needed.
    // For finer control over scopes / profile mapping:
    //   Google({
    //     authorization: { params: { scope: "openid email profile" } },
    //     profile(p) {
    //       return {
    //         id: p.sub,
    //         email: p.email,
    //         name: p.name,
    //         image: p.picture,
    //       };
    //     },
    //   }),
    Google,
  ],
});
