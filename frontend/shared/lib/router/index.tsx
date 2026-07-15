"use client";

/**
 * Portable router primitives.
 *
 * Same API surface as the legacy router-compat shim (useNavigate / useLocation /
 * Link / Navigate / useParams) but the basename comes from <RouterProvider basename="…">
 * context instead of being baked at module-load. That's the one knob downstream
 * consumers need to mount these slices under any path (or none).
 *
 *   <RouterProvider basename="/dashboard">
 *     ...
 *   </RouterProvider>
 *
 * No provider → basename === "" (slices mount at site root).
 */

import * as React from "react";
import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import {
  useRouter,
  usePathname,
  useParams as useNextParams,
} from "next/navigation";

const BasenameCtx = React.createContext<string>("");

export function RouterProvider({
  basename = "",
  children,
}: {
  basename?: string;
  children: React.ReactNode;
}) {
  return <BasenameCtx.Provider value={basename}>{children}</BasenameCtx.Provider>;
}

export function useBasename(): string {
  return React.useContext(BasenameCtx);
}

function isAbsolute(path: string): boolean {
  return path.startsWith("http://") || path.startsWith("https://");
}

function joinBase(basename: string, path: string): string {
  if (isAbsolute(path)) return path;
  if (!basename) return path.startsWith("/") ? path : "/" + path;
  if (path.startsWith(basename)) return path;
  if (!path.startsWith("/")) path = "/" + path;
  if (path === "/") return basename;
  return basename + path;
}

function stripBase(basename: string, path: string | null): string {
  if (!path) return "/";
  if (!basename) return path;
  if (path === basename) return "/";
  if (path.startsWith(basename + "/")) return path.slice(basename.length) || "/";
  return path;
}

export function useNavigate() {
  const router = useRouter();
  const basename = useBasename();
  return React.useCallback(
    (to: string | number, opts?: { replace?: boolean }) => {
      if (typeof to === "number") {
        if (to < 0) router.back();
        else router.forward();
        return;
      }
      const href = joinBase(basename, to);
      if (opts?.replace) router.replace(href);
      else router.push(href);
    },
    [router, basename],
  );
}

export function useLocation() {
  const pathname = usePathname();
  const basename = useBasename();
  return {
    pathname: stripBase(basename, pathname),
    search: "",
    hash: "",
    state: null,
    key: "default",
  };
}

export function useParams<
  T extends Record<string, string | undefined> = Record<string, string | undefined>,
>(): T {
  return useNextParams() as unknown as T;
}

interface LinkProps extends Omit<NextLinkProps, "href"> {
  to: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLAnchorElement>;
  target?: string;
  rel?: string;
  title?: string;
  "aria-label"?: string;
  [dataAttr: `data-${string}`]: unknown;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, children, ...rest },
  ref,
) {
  const basename = useBasename();
  return (
    <NextLink ref={ref} href={joinBase(basename, to)} {...rest}>
      {children}
    </NextLink>
  );
});
