"use client";

/**
 * Drop-in compatibility shim for the legacy SPA's react-router-dom imports,
 * backed by next/navigation. All SPA routes live under /dashboard/* in App
 * Router, so this module prepends BASENAME on every navigation/href and
 * strips it from pathnames returned to consumers.
 */

import * as React from "react";
import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import {
  useRouter,
  usePathname,
  useParams as useNextParams,
} from "next/navigation";

const BASENAME = "/dashboard";

function withBase(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith(BASENAME)) return path;
  if (!path.startsWith("/")) path = "/" + path;
  if (path === "/") return BASENAME;
  return BASENAME + path;
}

function stripBase(path: string | null): string {
  if (!path) return "/";
  if (path === BASENAME) return "/";
  if (path.startsWith(BASENAME + "/")) return path.slice(BASENAME.length) || "/";
  return path;
}

export function useNavigate() {
  const router = useRouter();
  return React.useCallback(
    (to: string | number, opts?: { replace?: boolean }) => {
      if (typeof to === "number") {
        if (to < 0) router.back();
        else router.forward();
        return;
      }
      const href = withBase(to);
      if (opts?.replace) router.replace(href);
      else router.push(href);
    },
    [router],
  );
}

export function useLocation() {
  const pathname = usePathname();
  return { pathname: stripBase(pathname), search: "", hash: "", state: null, key: "default" };
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return (useNextParams() as unknown) as T;
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
  return (
    <NextLink ref={ref} href={withBase(to)} {...rest}>
      {children}
    </NextLink>
  );
});

interface NavigateProps {
  to: string;
  replace?: boolean;
}

export function Navigate({ to, replace = true }: NavigateProps) {
  const router = useRouter();
  React.useEffect(() => {
    const href = withBase(to);
    if (replace) router.replace(href);
    else router.push(href);
  }, [router, to, replace]);
  return null;
}
