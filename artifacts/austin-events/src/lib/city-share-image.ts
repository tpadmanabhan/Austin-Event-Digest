/** Shared by initial server HTML and client navigation; never default to another city. */
export const LA_HERO_IMAGE_URL = "https://upload.wikimedia.org/wikipedia/commons/3/33/POINTDUME_CA6.jpg";

const CITY_SHARE_IMAGES: Record<string, string> = {
  austin: "opengraph.jpg",
  austincares: "images/austin-cares-brand-icon.jpg",
  brushycreek: "images/brushycreek-hero.jpg",
  portland: "images/portland-hero.jpg",
  sacramento: "images/sacramento-hero.jpg",
  bulverde: "images/bulverde-hero.jpg",
  stlouis: "images/stlouis-hero.jpg",
  dc: "images/dc-hero.jpg",
  // Raster rendition of the existing Atlanta illustration, stored as a public brand asset.
  atlanta: "api/storage/public-objects/city-previews/atlanta-share.png",
  houston: "images/houston-dusk.jpg",
  sanfrancisco: "images/sanfrancisco-hero.jpg",
  miami: "api/storage/public-objects/cities/miami/share.jpg",
  boston: "api/storage/public-objects/cities/boston/hero.jpg",
  la: LA_HERO_IMAGE_URL,
  tokyo: "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=1200&h=630&auto=format&fit=crop&q=80",
};

export function cityShareImage(citySlug: string | null, origin: string, basePath = "/") {
  if (!citySlug) {
    return new URL(`${basePath.replace(/\/?$/, "/")}images/irl-open-graph.jpg`, origin).href;
  }
  const image = citySlug ? CITY_SHARE_IMAGES[citySlug] : undefined;
  // New cities without an assigned illustration get the neutral platform logo, not Austin.
  const path = image ?? "eventcarpooling-logo.png";
  return new URL(/^https?:\/\//.test(path) ? path : `${basePath.replace(/\/?$/, "/")}${path}`, origin).href;
}
