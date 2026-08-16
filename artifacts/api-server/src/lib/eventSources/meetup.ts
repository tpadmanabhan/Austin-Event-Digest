import type { SourceAdapter, SourceQuery } from "./types";
import type { EventItem } from "@workspace/db";
import { resolveCityGeo, getCategorySearchQuery, formatISODate, isWithinDateRange, guessCategory } from "./utils";
import { logger } from "../logger";

interface MeetupEvent {
  id: string;
  title: string;
  dateTime: string;
  endTime?: string;
  eventUrl: string;
  description?: string;
  venue?: {
    name?: string;
    address?: string;
    city?: string;
  };
  group?: {
    name?: string;
  };
}

interface MeetupGQLResponse {
  data?: {
    keywordSearch?: {
      edges: Array<{
        node: {
          result: MeetupEvent & { __typename?: string };
        };
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

async function fetchMeetupEvents(query: SourceQuery): Promise<EventItem[]> {
  const geo = await resolveCityGeo(query.city);
  if (!geo) {
    logger.warn({ city: query.city }, "Meetup: unknown city");
    return [];
  }

  const keyword = getCategorySearchQuery(query.category);

  const gql = {
    query: `query {
      keywordSearch(
        filter: { query: "${keyword} ${query.city}", source: EVENTS, lat: ${geo.lat}, lon: ${geo.lon}, radius: 25 }
        input: { first: 20 }
      ) {
        edges {
          node {
            result {
              ... on Event {
                id
                title
                dateTime
                eventUrl
                description
                venue { name address city }
                group { name }
              }
            }
          }
        }
      }
    }`,
  };

  const res = await fetch("https://api.meetup.com/gql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "eventcarpooling-newsletter/1.0",
    },
    body: JSON.stringify(gql),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      logger.debug({ status: res.status }, "Meetup: public GraphQL endpoint not available — skipping");
    } else {
      logger.warn({ status: res.status }, "Meetup: unexpected response");
    }
    return [];
  }

  const data = (await res.json()) as MeetupGQLResponse;

  if (data.errors?.length) {
    logger.debug({ errors: data.errors.map(e => e.message) }, "Meetup: GraphQL errors");
    return [];
  }

  const edges = data.data?.keywordSearch?.edges || [];
  const events: EventItem[] = [];

  for (const edge of edges) {
    const ev = edge.node?.result;
    if (!ev?.title || !ev?.dateTime) continue;
    if (!isWithinDateRange(ev.dateTime, query.weekOf, query.weekEnd)) continue;

    const venueName = ev.venue?.name || ev.group?.name || query.city;
    const venueCity = ev.venue?.city || query.city;
    const venue = venueName !== venueCity ? `${venueName}, ${venueCity}` : venueCity;

    const rawDesc = ev.description || "";
    const description = rawDesc
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 400)
      || `${ev.title} via Meetup in ${query.city}`;

    events.push({
      title: ev.title.trim(),
      date: formatISODate(ev.dateTime, geo.timezone),
      venue: venue.substring(0, 120),
      description,
      category: guessCategory(`${ev.title} ${description}`),
      link: ev.eventUrl || null,
      imageUrl: null,
      source: "Meetup",
    });
  }

  logger.info({ source: "Meetup", category: query.category, found: events.length }, "Meetup adapter result");
  return events;
}

export const meetupAdapter: SourceAdapter = {
  name: "Meetup",
  fetchEvents: fetchMeetupEvents,
};
