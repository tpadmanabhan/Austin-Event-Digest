import { createContext, useContext, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export interface TenantConfig {
  slug: string;
  name: string;
  city: string;
  accentColor: string;
  categories: string[];
  firstRun: boolean;
  hasEmailAdmin: boolean;
}

const TenantContext = createContext<TenantConfig | null>(null);

async function fetchTenantConfig(slug: string): Promise<TenantConfig> {
  const res = await fetch(`/api/tenant/config?slug=${encodeURIComponent(slug)}`);
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error("FETCH_ERROR");
  const data = await res.json();
  return data.tenant as TenantConfig;
}

function CityLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-20 bg-card border-b border-border/40 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 py-24 space-y-8">
        <div className="h-10 w-1/2 bg-muted rounded-xl animate-pulse" />
        <div className="h-6 w-2/3 bg-muted rounded-xl animate-pulse" />
        <div className="h-6 w-1/2 bg-muted rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function CityNotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl mb-6">🗺️</p>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-4">City not found</h1>
        <p className="text-muted-foreground text-lg mb-8">
          We don't have a newsletter for this city yet. Want to launch one?
        </p>
        <a
          href={`https://eventcarpooling.com#launch`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
        >
          Launch your city →
        </a>
      </div>
    </div>
  );
}

export function TenantProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const { data: tenant, isLoading, error } = useQuery<TenantConfig, Error>({
    queryKey: ["tenant-config", slug],
    queryFn: () => fetchTenantConfig(slug),
    staleTime: 10 * 60 * 1000,
    retry: (count, err) => err.message !== "NOT_FOUND" && count < 2,
  });

  useEffect(() => {
    if (tenant?.accentColor) {
      document.documentElement.style.setProperty("--color-primary", tenant.accentColor);
    }
    return () => {
      document.documentElement.style.removeProperty("--color-primary");
    };
  }, [tenant?.accentColor]);

  if (isLoading) return <CityLoadingSkeleton />;
  if (error?.message === "NOT_FOUND") return <CityNotFoundPage />;
  if (!tenant) return null;

  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantConfig {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside TenantProvider");
  return ctx;
}
