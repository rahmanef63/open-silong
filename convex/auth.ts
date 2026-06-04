import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      crypto: {
        async hashSecret(password: string) {
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const encoder = new TextEncoder();
          const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
          );
          const hashBuffer = await crypto.subtle.deriveBits(
            { name: "PBKDF2", salt, iterations: 10000, hash: "SHA-256" },
            keyMaterial,
            256
          );
          const hashHex = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          const saltHex = Array.from(salt)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          return `pbkdf2_${saltHex}_${hashHex}`;
        },
        async verifySecret(password: string, hash: string) {
          if (hash.startsWith("pt_")) return hash === `pt_${password}`;
          const parts = hash.split("_");
          if (parts[0] !== "pbkdf2" || parts.length !== 3) return false;
          const salt = new Uint8Array(
            parts[1].match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
          );
          const encoder = new TextEncoder();
          const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
          );
          const hashBuffer = await crypto.subtle.deriveBits(
            { name: "PBKDF2", salt, iterations: 10000, hash: "SHA-256" },
            keyMaterial,
            256
          );
          const hashHex = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          return hashHex === parts[2];
        },
      },
    }),
    // Google OAuth is opt-in: only registered when the deployment has
    // credentials (pnpm exec convex env set AUTH_GOOGLE_ID/SECRET). The
    // public demo + fresh clones run without it — pair with
    // NEXT_PUBLIC_AUTH_GOOGLE=1 on the frontend to show the button.
    ...(process.env.AUTH_GOOGLE_ID ? [Google] : []),
    // Demo guest mode — the showcase deployment auto-signs visitors in
    // anonymously so they land straight in a real workspace (no form).
    // Anonymous users are blocked from claimSuperAdmin (see admin/mutations).
    Anonymous,
  ],
});
