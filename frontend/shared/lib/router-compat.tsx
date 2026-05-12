"use client";

/**
 * Back-compat re-export. New code should import from "@/shared/lib/router"
 * directly and wrap with <RouterProvider basename="…"> at the layout level.
 *
 * This shim is kept so unconverted call-sites keep working; it does NOT add
 * the /dashboard basename anymore — that responsibility moved to
 * <RouterProvider basename="/dashboard"> in app/dashboard/layout.tsx.
 */
export {
  RouterProvider,
  useBasename,
  useNavigate,
  useLocation,
  useParams,
  Link,
  Navigate,
} from "./router";
