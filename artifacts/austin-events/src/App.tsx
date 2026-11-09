import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { Redirect } from "wouter";
import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AudioProvider } from "@/components/audio-provider";

import Home from "./pages/home";
import GolfHomeRoute from "./pages/golf-home-route";
import AustinCaresDeals from "./pages/austin-cares-deals";
import AustinCaresFullEdition from "./pages/austin-cares-full";
import { CityPageMetadata } from "./components/city-page-metadata";
import DigestView from "./pages/digest";
import AdminDashboard from "./pages/admin";
import { AdminLoginGate } from "@/components/admin-login-gate";
import RsvpPage from "./pages/rsvp";
import UnsubscribePage from "./pages/unsubscribe";
import PreferencesPage from "./pages/preferences";
import LeadershipToysForTotsPage from "./pages/toys-for-tots";
import NotFound from "@/pages/not-found";
import PlatformHome from "./pages/platform-home";
import MaintenancePage from "./pages/maintenance";
import CentinelaHome from "./pages/centinela-home";
import CentinelaResidents from "./pages/centinela-residents";
import CentinelaAdmin from "./pages/centinela-admin";
import {
  CentinelaSignIn,
  CentinelaSignUp,
  centinelaClerkAppearance,
} from "./pages/centinela-auth";
import type { CentinelaOfficialLinks } from "./pages/centinela-types";

// MAINTENANCE MODE — set to false to restore the platform home
const MAINTENANCE_MODE = false;
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

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const centinelaOfficialLinks: CentinelaOfficialLinks = {
  community: "https://rossmorganco.com/rmc/centinela-ocean-view/",
  hoa: "https://rossmorganco.com/user-login/",
  services: "https://rossmorganco.com/form/request-service/",
  vendors: "https://rossmorganco.com/preferred-vendors/",
};

function stripClerkBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        client.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);

  return null;
}

function CentinelaClientAuth({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const [, setLocation] = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  // Keep the server-rendered public page and the first client render identical.
  if (!ready) return <>{fallback}</>;

  const clerkPubKey = publishableKeyFromHost(
    window.location.hostname,
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  );
  const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

  if (!clerkPubKey) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY for Centinela resident sign-in.");
  }

  const appearance = {
    theme: shadcn,
    cssLayerName: "clerk",
    options: {
      logoPlacement: "inside" as const,
      logoLinkUrl: basePath || "/",
      logoImageUrl: `${window.location.origin}${basePath}/centinela-logo.svg`,
    },
    ...centinelaClerkAppearance,
  };

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome home",
            subtitle: "Your neighbors and community updates are waiting.",
          },
        },
        signUp: {
          start: {
            title: "Join your neighbor community",
            subtitle: "Use an email approved for resident access.",
          },
        },
      }}
      routerPush={(to) => setLocation(stripClerkBase(to))}
      routerReplace={(to) => setLocation(stripClerkBase(to), { replace: true })}
    >
      <ClerkQueryCacheInvalidator />
      {children}
    </ClerkProvider>
  );
}

function CentinelaAuthLoading({ message = "Opening the resident space…" }: { message?: string }) {
  return (
    <main className="centinela">
      <div className="cv-container cv-portal">
        <div className="cv-skeleton" role="status" aria-label={message} />
      </div>
    </main>
  );
}

function CentinelaHomeRedirect() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <CentinelaAuthLoading message="Loading community…" />;
  return isSignedIn
    ? <Redirect to="/residents" />
    : <CentinelaHome links={centinelaOfficialLinks} />;
}

function CentinelaResidentRoute() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <CentinelaAuthLoading />;
  return isSignedIn
    ? <CentinelaResidents links={centinelaOfficialLinks} />
    : <Redirect to="/sign-in" />;
}

function CentinelaSignInRoute() {
  return (
    <CentinelaSignIn>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </CentinelaSignIn>
  );
}

function CentinelaSignUpRoute() {
  return (
    <CentinelaSignUp>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </CentinelaSignUp>
  );
}

function CentinelaServerRoutes() {
  return (
    <Switch>
      <Route path="/" component={() => <CentinelaHome links={centinelaOfficialLinks} />} />
      <Route path="/sign-in/*?" component={() => <CentinelaHome links={centinelaOfficialLinks} />} />
      <Route path="/sign-up/*?" component={() => <CentinelaHome links={centinelaOfficialLinks} />} />
      <Route path="/residents" component={() => <CentinelaAuthLoading />} />
      <Route path="/admin/centinela">
        <AdminLoginGate><CentinelaAdmin /></AdminLoginGate>
      </Route>
      <Route path="/admin">
        <AdminLoginGate><AdminDashboard /></AdminLoginGate>
      </Route>
      <Route path="/digest/:id" component={DigestView} />
      <Route path="/rsvp" component={RsvpPage} />
      <Route path="/unsubscribe" component={UnsubscribePage} />
      <Route path="/preferences" component={PreferencesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function CentinelaBrowserRoutes() {
  return (
    <Switch>
      <Route path="/" component={CentinelaHomeRedirect} />
      <Route path="/sign-in/*?" component={CentinelaSignInRoute} />
      <Route path="/sign-up/*?" component={CentinelaSignUpRoute} />
      <Route path="/residents" component={CentinelaResidentRoute} />
      <Route path="/admin/centinela">
        <AdminLoginGate><CentinelaAdmin /></AdminLoginGate>
      </Route>
      <Route path="/admin">
        <AdminLoginGate><AdminDashboard /></AdminLoginGate>
      </Route>
      <Route path="/digest/:id" component={DigestView} />
      <Route path="/rsvp" component={RsvpPage} />
      <Route path="/unsubscribe" component={UnsubscribePage} />
      <Route path="/preferences" component={PreferencesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function CentinelaRoutes() {
  return (
    <CentinelaClientAuth fallback={<CentinelaServerRoutes />}>
      <CentinelaBrowserRoutes />
    </CentinelaClientAuth>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    const anchor = window.location.hash.slice(1);
    if (!anchor) { window.scrollTo(0, 0); return; }
    const scroll = () => {
      const target = document.getElementById(anchor);
      if (!target) return false;
      target.scrollIntoView(); return true;
    };
    if (scroll()) return;
    const observer = new MutationObserver(() => { if (scroll()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 5000);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [location]);
  return null;
}

function CityRoutes({ citySlug }: { citySlug: string }) {
  return (
    <LanguageProvider>
    <TenantProvider slug={citySlug}>
      <ScrollToTop />
      <CityPageMetadata citySlug={citySlug} />
      {citySlug === "centinela" ? (
        <CentinelaRoutes />
      ) : (
        <Switch>
          <Route path="/" component={citySlug === "austincares" ? AustinCaresDeals : citySlug === "golf" ? GolfHomeRoute : Home} />
          <Route path="/full" component={citySlug === "austincares" ? AustinCaresFullEdition : NotFound} />
          <Route path="/digest/:id" component={DigestView} />
          <Route path="/toys-for-tots" component={citySlug === "leadershipaustin" ? LeadershipToysForTotsPage : NotFound} />
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
      )}
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
          <Route path="/" component={MAINTENANCE_MODE ? MaintenancePage : PlatformHome} />
          <Route path="/digest/:id">
            {(params) => {
              window.location.replace(`https://austin.irl.group/digest/${params.id}`);
              return null;
            }}
          </Route>
          <Route path="/rsvp">
            {() => {
              window.location.replace(`https://austin.irl.group${window.location.pathname}${window.location.search}`);
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
          <WouterRouter base={basePath}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AudioProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
