import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider, useStore } from "@/lib/store";
import Index from "./pages/Index.tsx";
import PageView from "./pages/PageView.tsx";
import Trash from "./pages/Trash.tsx";
import NotFound from "./pages/NotFound.tsx";
import Settings from "./pages/Settings.tsx";
import Profile from "./pages/Profile.tsx";
import Shared from "./pages/Shared.tsx";

const queryClient = new QueryClient();

function LandingRedirect() {
  const { preferences, pages, recents } = useStore();
  switch (preferences.landingView) {
    case "last":
      if (preferences.lastOpenedPageId && pages.find(p => p.id === preferences.lastOpenedPageId && !p.trashed))
        return <Navigate to={`/p/${preferences.lastOpenedPageId}`} replace />;
      return <Index />;
    case "recent":
      if (recents[0]) return <Navigate to={`/p/${recents[0]}`} replace />;
      return <Index />;
    case "favorites": {
      const fav = pages.find(p => p.favorite && !p.trashed);
      if (fav) return <Navigate to={`/p/${fav.id}`} replace />;
      return <Index />;
    }
    default:
      return <Index />;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingRedirect />} />
            <Route path="/p/:id" element={<PageView />} />
            <Route path="/share/:id" element={<Shared />} />
            <Route path="/trash" element={<Trash />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
