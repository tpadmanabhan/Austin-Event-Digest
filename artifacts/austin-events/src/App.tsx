import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AudioProvider } from "@/components/audio-provider";

import Home from "./pages/home";
import AustinCaresDeals from "./pages/austin-cares-deals";
import AustinCaresFullEdition from "./pages/austin-cares-full";
import DigestView from "./pages/digest";
import AdminDashboard from "./pages/admin";
import { AdminLoginGate } from "@/components/admin-login-gate";
import RsvpPage from "./pages/rsvp";
import UnsubscribePage from "./pages/unsubscribe";
import PreferencesPage from "./pages/preferences";
import NotFound from "@/pages/not-found";
import PlatformHome from "./pages/platform-home";
import { TenantProvider } from "./contexts/tenant-context";
import { LanguageProvider } from "./contexts/language-context";
import { useDomain } from "./hooks/use-domain";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function CityRoutes({ citySlug }: { citySlug: string }) {
  return (
    <LanguageProvider>
    <TenantProvider slug={citySlug}>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={citySlug === "austincares" ? AustinCaresDeals : Home} />
        <Route path="/full" component={citySlug === "austincares" ? AustinCaresFullEdition : NotFound} />
        <Route path="/digest/:id" component={DigestView} />
        <Route path="/admin">
          <AdminLoginGate>
            <AdminDashboard />
          </AdminLoginGate>
        </Route>
        <Route path="/rsvp" component={RsvpPage} />
        <Route path="/unsubscribe" component={UnsubscribePage} />
        <Route path="/preferences" component={PreferencesPage} />
        <Route component={NotFound} />
      </Switch>
    </TenantProvider>
    </LanguageProvider>
  );
}

function Router() {
  const { isPlatformRoot, citySlug } = useDomain();

  if (isPlatformRoot) {
    return (
      <>
        <ScrollToTop />
        <Switch>
          <Route path="/" component={PlatformHome} />
          <Route path="/digest/:id">
            {(params) => {
              window.location.replace(`https://austin.eventcarpooling.com/digest/${params.id}`);
              return null;
            }}
          </Route>
          <Route path="/rsvp">
            {() => {
              window.location.replace(`https://austin.eventcarpooling.com${window.location.pathname}${window.location.search}`);
              return null;
            }}
          </Route>
          <Route component={NotFound} />
        </Switch>
      </>
    );
  }

  return <CityRoutes citySlug={citySlug!} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AudioProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AudioProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
