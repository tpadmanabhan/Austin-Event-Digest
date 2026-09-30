import { useEffect } from "react";
import { useLocation } from "wouter";

const DEFAULT_TITLE = "EventCarpooling — Local Events, Weekly Digest";
const DEFAULT_DESCRIPTION = "Weekly curated digests of the best local events in your city — live music, tech meetups, food pop-ups, and more.";

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

  useEffect(() => {
    const isCares = citySlug === "austincares";
    const isAustin = citySlug === "austin";
    const isAtlanta = citySlug === "atlanta";
    const isHouston = citySlug === "houston";
    const isHoustonDigest = isHouston && path.startsWith("/digest/");
    const isAtlantaDigest = isAtlanta && path.startsWith("/digest/");
    const title = isCares
      ? path === "/full" ? "Weekly Deals & Free Services | AustinCares" : "AustinCares — Food Deals & Free Services"
      : isAustin ? "Raj's Austin Events — Weekly Local Events"
      : isAtlantaDigest ? "Atlanta Events — Full Weekly Edition | EventCarpooling"
      : isAtlanta ? "Atlanta Events — A Local Guide for the Curious | EventCarpooling"
      : isHoustonDigest ? "Houston Events — Full Citywide Edition | EventCarpooling"
      : isHouston ? "Houston Events — The Whole City. Your Next Plan. | EventCarpooling"
      : DEFAULT_TITLE;
    const description = isCares
      ? "Find Austin-area food specials, free neighborhood services, health screenings and community resources, organized by day and location."
      : isAustin
        ? "Discover Austin's weekly picks for live music, food, tech, sports and community events."
        : isAtlanta
        ? "Explore real gatherings across Atlanta: tech, arts, sports, civic life and wellness. Browse the weekly local events edition and find your people."
        : isHouston
        ? "Explore Houston's citywide events edition: real local plans across innovation, art, sports, civic life and wellness, from the bayou to your neighborhood."
        : DEFAULT_DESCRIPTION;

    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[property="og:url"]', new URL(path, window.location.origin).href);
    if (isAtlanta || isHouston) {
      const image = new URL(`${import.meta.env.BASE_URL}images/${isHouston ? "houston-dusk.jpg" : "atlanta-hero.svg"}`, window.location.origin).href;
      ensureMeta("property", "og:image", image);
      ensureMeta("name", "twitter:image", image);
      setMeta('meta[name="twitter:card"]', "summary_large_image");
    } else {
      document.querySelector('meta[property="og:image"]')?.remove();
      document.querySelector('meta[name="twitter:image"]')?.remove();
      setMeta('meta[name="twitter:card"]', "summary");
    }

    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = `${import.meta.env.BASE_URL}${isHouston ? "images/houston-astros.svg" : isAtlanta ? "images/atlanta-icon.svg" : isCares ? "austincares-favicon.svg" : "favicon.svg"}`;
  }, [citySlug, path]);

  return null;
}