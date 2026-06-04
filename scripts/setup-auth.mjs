// Build-time auth bootstrap — so a cloner NEVER touches Convex env for login.
// Runs only when CONVEX_DEPLOY_KEY is present (i.e. a real clone build); the
// deploy key lets us set the deployment's env. Idempotent: generates the
// @convex-dev/auth JWT keys once and skips if they already exist (so sessions
// aren't invalidated on every deploy). Same pattern as the template fleet.
import { execFileSync } from "node:child_process";

if (!process.env.CONVEX_DEPLOY_KEY) {
  console.log("[setup-auth] no CONVEX_DEPLOY_KEY — skipping (demo/local).");
  process.exit(0);
}

const npx = (args, capture = false) =>
  execFileSync("npx", args, {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "ignore"] : "inherit",
  });

function envGet(name) {
  try {
    return npx(["convex", "env", "get", name], true).trim();
  } catch {
    return "";
  }
}

if (envGet("JWT_PRIVATE_KEY")) {
  console.log("[setup-auth] JWT keys already set — skip.");
  process.exit(0);
}

console.log("[setup-auth] generating auth keys…");
// Same format as `npx @convex-dev/auth` (jose RS256, newlines → spaces).
// IMPORTANT: private key + JWKS must come from ONE generateKeyPair call.
const { generateKeyPair, exportPKCS8, exportJWK } = await import("jose");
const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, " ");
const jwk = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...jwk }] });

const site =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "");

// NAME=value form: the value starts with "-----BEGIN", which the CLI would else
// parse as a flag.
npx(["convex", "env", "set", `JWT_PRIVATE_KEY=${privateKey}`]);
npx(["convex", "env", "set", `JWKS=${jwks}`]);
if (site) npx(["convex", "env", "set", `SITE_URL=${site}`]);
console.log("[setup-auth] auth keys provisioned ✔");
