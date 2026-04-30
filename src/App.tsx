import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider, useStore } from "@/lib/store";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { useConvexAuth } from "convex/react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { RouteSkeleton } from "@/shared/components/RouteSkeleton";

const Index = lazy(() => import("./pages/Index.tsx"));
const PageView = lazy(() => import("./pages/PageView.tsx"));
const Trash = lazy(() => import("./pages/Trash.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Shared = lazy(() => import("./pages/Shared.tsx"));
const Inbox = lazy(() => import("./pages/Inbox.tsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.tsx"));

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
