import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { Toaster } from "@/shared/ui/toaster";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { StoreProvider, useStore } from "@/shared/lib/store";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { useConvexAuth } from "convex/react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { RouteSkeleton } from "@/shared/components/RouteSkeleton";
import { CommandPalette } from "@/slices/command-palette";

const Index = lazy(() => import("./routes/Index.tsx"));
const PageView = lazy(() => import("./routes/PageView.tsx"));
const Trash = lazy(() => import("./routes/Trash.tsx"));
const NotFound = lazy(() => import("./routes/NotFound.tsx"));
const Settings = lazy(() => import("./routes/Settings.tsx"));
const Profile = lazy(() => import("./routes/Profile.tsx"));
const Shared = lazy(() => import("./routes/Shared.tsx"));
const Inbox = lazy(() => import("./routes/Inbox.tsx"));
const AuthPage = lazy(() => import("./routes/AuthPage.tsx"));

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
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <AuthPage />
      </Suspense>
    );
  }
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <ConvexClientProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthGuard>
          <StoreProvider>
            <BrowserRouter>
              <CommandPalette />
              <ErrorBoundary>
                <Suspense fallback={<RouteSkeleton />}>
                  <Routes>
                    <Route path="/" element={<LandingRedirect />} />
                    <Route path="/p/:id" element={<PageView />} />
                    <Route path="/share/:id" element={<Shared />} />
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
    </ConvexClientProvider>
  </ErrorBoundary>
);

export default App;
