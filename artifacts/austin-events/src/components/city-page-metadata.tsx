import { useEffect } from "react";
import { useLocation } from "wouter";

const DEFAULT_TITLE = "EventCarpooling — Local Events, Weekly Digest";
const DEFAULT_DESCRIPTION = "Weekly curated digests of the best local events in your city — live music, tech meetups, food pop-ups, and more.";

function setMeta(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
}

export function CityPageMetadata({ citySlug }: { citySlug: string }) {
  const [path] = useLocation();

  useEffect(() => {
    const isCares = citySlug === "austincares";
    const isAustin = citySlug === "austin";
    const title = isCares
      ? path === "/full" ? "Weekly Deals & Free Services | AustinCares" : "AustinCares — Food Deals & Free Services"
      : isAustin ? "Raj's Austin Events — Weekly Local Events" : DEFAULT_TITLE;
    const description = isCares
      ? "Find Austin-area food specials, free neighborhood services, health screenings and community resources, organized by day and location."
      : isAustin
        ? "Discover Austin's weekly picks for live music, food, tech, sports and community events."
        : DEFAULT_DESCRIPTION;

    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[property="og:url"]', new URL(path, window.location.origin).href);

    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = `${import.meta.env.BASE_URL}${isCares ? "austincares-favicon.svg" : "favicon.svg"}`;
  }, [citySlug, path]);

  return null;
}