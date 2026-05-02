import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { Toaster } from "@/shared/ui/toaster";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { StoreProvider, useStore } from "@/shared/lib/store";
import { useConvexAuth } from "convex/react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { RouteSkeleton } from "@/shared/components/RouteSkeleton";

const CommandPalette = lazy(() =>
  import("@/slices/command-palette").then((m) => ({ default: m.CommandPalette })),
);
const Index = lazy(() => import("./routes/Index"));
const PageView = lazy(() => import("./routes/PageView"));
const Trash = lazy(() => import("./routes/Trash"));
const NotFound = lazy(() => import("./routes/NotFound"));
const Settings = lazy(() => import("./routes/Settings"));
const Profile = lazy(() => import("./routes/Profile"));
const Inbox = lazy(() => import("./routes/Inbox"));

function LandingRedirect() {
  const { preferences, pages, recents, getPage } = useStore();
  switch (preferences.landingView) {
    case "last": {
      const last = preferences.lastOpenedPageId ? getPage(preferences.lastOpenedPageId) : undefined;
      if (last && !last.trashed) return <Navigate to={`/p/${last.id}`} replace />;
      return <Index />;
    }
    case "recent":
      if (recents[0]) return <Navigate to={`/p/${recents[0]}`} replace />;
      return <Index />;
    case "favorites": {
      const fav = pages.find((p) => p.favorite && !p.trashed);
      if (fav) return <Navigate to={`/p/${fav.id}`} replace />;
      return <Index />;
    }
    default:
      return <Index />;
  }
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return <RouteSkeleton />;
  if (!isAuthenticated) {
    // proxy.ts already redirects unauthed → /auth at the edge.
    // This is a fallback if proxy is bypassed (cached client nav).
    if (typeof window !== "undefined") window.location.replace("/auth");
    return <RouteSkeleton />;
  }
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthGuard>
        <StoreProvider>
          <BrowserRouter>
            <Suspense fallback={null}>
              <CommandPalette />
            </Suspense>
            <ErrorBoundary>
              <Suspense fallback={<RouteSkeleton />}>
                <Routes>
                  <Route path="/" element={<LandingRedirect />} />
                  <Route path="/p/:id" element={<PageView />} />
                  <Route path="/inbox" element={<Inbox />} />
                  <Route path="/trash" element={<Trash />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </StoreProvider>
      </AuthGuard>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
