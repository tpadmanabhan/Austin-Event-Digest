import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface MapEvent {
  title: string;
  venue?: string | null;
  lat?: number | null;
  lng?: number | null;
  featured?: boolean;
  isPost?: boolean;
  isBusinessSpotlight?: boolean;
}

interface EventMapProps {
  events: MapEvent[];
  center: [number, number];
  radiusMiles?: number;
  height?: number;
  className?: string;
}

export function EventMap({
  events,
  center,
  radiusMiles = 30,
  height = 360,
  className = "",
}: EventMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    (async () => {
      const L = (await import("leaflet")).default;
      if (!mounted || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Coverage circle — semi-transparent purple like the reference
      const radiusM = radiusMiles * 1609.34;
      L.circle(center, {
        radius: radiusM,
        color: "#7c3aed",
        fillColor: "#7c3aed",
        fillOpacity: 0.13,
        weight: 1.5,
        opacity: 0.4,
      }).addTo(map);

      // Haversine distance in miles — keeps pins within 150 miles of city center,
      // eliminating geocoding drift that places venues in other countries/states.
      const haversineMiles = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 3958.8;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
      const MAX_MAP_RADIUS_MILES = 150;

      // Only show real events (skip posts / spotlights) within 150 miles of city center
      const geocoded = events.filter(
        (e) =>
          e.lat != null && e.lng != null &&
          !e.isPost && !e.isBusinessSpotlight &&
          haversineMiles(center[0], center[1], e.lat!, e.lng!) <= MAX_MAP_RADIUS_MILES
      );

      geocoded.forEach((event, idx) => {
        const isFeat = Boolean(event.featured);
        const bg = isFeat ? "#f59e0b" : "#7c3aed";
        const border = isFeat ? "#fde68a" : "#c4b5fd";
        const num = idx + 1;

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:${bg};border:2.5px solid ${border};
            box-shadow:0 2px 8px rgba(0,0,0,0.4);
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:800;color:#fff;line-height:1;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          ">${num}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -18],
        });

        const titleLabel = isFeat ? `⭐ ${event.title}` : event.title;
        const popup = `<div style="min-width:140px;max-width:220px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <strong style="font-size:13px;line-height:1.3;display:block;margin-bottom:4px;">${titleLabel}</strong>
          ${event.venue ? `<span style="font-size:11px;color:#78716c;">${event.venue}</span>` : ""}
        </div>`;

        L.marker([event.lat!, event.lng!], { icon })
          .addTo(map)
          .bindPopup(popup, { maxWidth: 240 });
      });

      // Fit map to geocoded markers if we have more than 1
      if (geocoded.length > 1) {
        const latlngs = geocoded.map((e) => [e.lat!, e.lng!] as [number, number]);
        map.fitBounds(latlngs, { padding: [36, 36], maxZoom: 12 });
      }
    })();

    return () => {
      mounted = false;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const haversineMilesOuter = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const geocodedCount = events.filter(
    (e) =>
      e.lat != null && e.lng != null &&
      !e.isPost && !e.isBusinessSpotlight &&
      haversineMilesOuter(center[0], center[1], e.lat!, e.lng!) <= 150
  ).length;

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        style={{ height, borderRadius: 16, overflow: "hidden", position: "relative", zIndex: 0 }}
      />
      {geocodedCount > 0 && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          📍 {geocodedCount} event{geocodedCount !== 1 ? "s" : ""} mapped · click a pin to see details
        </p>
      )}
    </div>
  );
}
