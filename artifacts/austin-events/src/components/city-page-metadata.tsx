import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTenant } from "@/contexts/tenant-context";
import { cityShareImage } from "@/lib/city-share-image";

function setMeta(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
}

function ensureMeta(attribute: "name" | "property", key: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

export function CityPageMetadata({ citySlug }: { citySlug: string }) {
  const [path] = useLocation();
  const tenant = useTenant();

  useEffect(() => {
    const initial = window.__PUBLIC_DOCUMENT__;
    if (initial?.citySlug === citySlug && new URL(initial.canonical).pathname === path) return;
    const isCares = citySlug === "austincares";
    const isAustin = citySlug === "austin";
    const isAtlanta = citySlug === "atlanta";
    const isHouston = citySlug === "houston";
    const isSF = citySlug === "sanfrancisco";
    const isLA = citySlug === "la";
    const isLeadershipAustin = citySlug === "leadershipaustin";
    const isGolf = citySlug === "golf";
    const isHoustonDigest = isHouston && path.startsWith("/digest/");
    const isAtlantaDigest = isAtlanta && path.startsWith("/digest/");
    const title = isCares
      ? path === "/full" ? "Weekly Deals & Free Services | AustinCares" : "AustinCares — Food Deals & Free Services"
      : isAustin ? "Raj's Austin Events — Weekly Local Events"
      : isAtlantaDigest ? "Atlanta Events — Full Weekly Edition | IRL"
      : isAtlanta ? "Atlanta Events — A Local Guide for the Curious | IRL"
      : isSF && path.startsWith("/digest/") ? "San Francisco Events — Full Edition, October 12–31 | IRL"
      : isSF ? "San Francisco Events — Fog, Hills, and Plenty to Do | IRL"
      : isLA && path.startsWith("/digest/") ? "Los Angeles Events — Full Edition | IRL"
      : isLA ? "Los Angeles Events — Pacific Coast, Citywide | IRL"
      : isHoustonDigest ? "Houston Events — Full Citywide Edition | IRL"
      : isHouston ? "Houston Events — The Whole City. Your Next Plan. | IRL"
      : isGolf ? "Golf IRL — Good Golf, Better Company | Austin Golf Events"
      : isLeadershipAustin ? "Leadership Austin — Alumni Happenings"
      : `${tenant.name} | Local Events & Community`;
    const description = isCares
      ? "Find Austin-area food specials, free neighborhood services, health screenings and community resources, organized by day and location."
      : isAustin
        ? "Discover Austin's weekly picks for live music, food, tech, sports and community events."
        : isAtlanta
        ? "Explore real gatherings across Atlanta: tech, arts, sports, civic life and wellness. Browse the weekly local events edition and find your people."
        : isSF
        ? "Explore San Francisco's events edition: tech, arts, sports, civic life and wellness across the city's neighborhoods, October 12–31, 2026."
        : isLA
        ? "Explore Los Angeles events across Tech, Arts, Sports, Civics and Wellness, with local organizer links and a city-specific AI ethics reading list."
        : isHouston
        ? "Explore Houston's citywide events edition: real local plans across innovation, art, sports, civic life and wellness, from the bayou to your neighborhood."
        : isGolf
        ? "Good golf. Better company. Explore Austin-area golf events, connect with local players, and get the Golf IRL newsletter."
        : isLeadershipAustin
        ? "A place for Leadership Austin alumni to stay connected, share upcoming events, and learn about local community stories."
        : `Explore curated ${tenant.city} events, local newsletters, venues, and community activities.`;

    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[property="og:url"]', new URL(path, window.location.origin).href);
    const image = cityShareImage(citySlug, window.location.origin, import.meta.env.BASE_URL);
    ensureMeta("property", "og:image", image);
    ensureMeta("name", "twitter:image", image);
    setMeta('meta[name="twitter:card"]', "summary_large_image");

    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = `${import.meta.env.BASE_URL}${isGolf ? "images/golf/favicon.svg" : isLA ? "images/la-mark.svg" : isSF ? "images/sf-giants.svg" : isHouston ? "images/houston-astros.svg" : isAtlanta ? "images/atlanta-icon.svg" : isCares ? "austincares-favicon.svg" : "favicon.svg"}`;
  }, [citySlug, path, tenant.name, tenant.city]);

  return null;
}