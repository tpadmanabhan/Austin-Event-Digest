/**
 * Extract a city name from a conventional venue suffix such as
 * "San Jose Convention Center, San Jose, CA" or "Venue, San Jose, CA 95113".
 */
export function cityLabelFromVenue(venue?: string | null): string | undefined {
  const parts = (venue ?? "").split(",").map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return undefined;

  const region = parts[parts.length - 1]!;
  if (!/^[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?$/i.test(region)) return undefined;

  return parts[parts.length - 2] || undefined;
}
