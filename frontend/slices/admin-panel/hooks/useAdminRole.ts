import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

export function useAdminRole() {
  const role = useQuery(api.admin.queries.getMyRole);
  const bootstrap = useMutation(api.admin.mutations.bootstrapMyProfile);

  useEffect(() => {
    if (role?.signedIn && role.role === "user") {
      // idempotent — auto-promotes when ADMIN_BOOTSTRAP_EMAILS matches
      bootstrap({}).catch(() => { /* ignore — surfaces elsewhere */ });
    }
  }, [role?.signedIn, role?.role, bootstrap]);

  return {
    isAdmin: role?.role === "admin",
    signedIn: !!role?.signedIn,
    loading: role === undefined,
  };
}
