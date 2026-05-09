import { useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

/** Single source of truth for "what can the current user see in the
 *  admin surface". Returns:
 *
 *    role                  — "user" | "admin" | "superadmin" (live)
 *    isAdmin               — true for admin OR superadmin (UI gate)
 *    signedIn              — auth state
 *    loading               — first-fetch flag
 *    claimableSuperAdmin   — workspace has zero superadmins; the
 *                            signed-in user can claim ownership via
 *                            `claim()`. First-deployer escape hatch
 *                            for fresh self-hosted installs that
 *                            don't have SUPER_ADMIN_EMAIL env set.
 *    claim()               — promotes the caller to superadmin.
 *                            Throws once a superadmin exists.
 */
export function useAdminRole() {
  const role = useQuery(api.admin.queries.getMyRole);
  const bootstrap = useMutation(api.admin.mutations.bootstrapMyProfile);
  const claimMutation = useMutation(api.admin.mutations.claimSuperAdmin);

  useEffect(() => {
    if (role?.signedIn && role.role === "user") {
      // idempotent — auto-promotes when ADMIN_BOOTSTRAP_EMAILS / SUPER_ADMIN_EMAIL matches
      bootstrap({}).catch(() => { /* ignore — surfaces elsewhere */ });
    }
  }, [role?.signedIn, role?.role, bootstrap]);

  const claim = useCallback(async () => {
    return await claimMutation({});
  }, [claimMutation]);

  const isAdmin = role?.role === "admin" || role?.role === "superadmin";
  return {
    role: role?.role ?? "user",
    isAdmin,
    isSuperAdmin: role?.role === "superadmin",
    signedIn: !!role?.signedIn,
    loading: role === undefined,
    claimableSuperAdmin: !!role?.claimableSuperAdmin,
    claim,
  };
}
