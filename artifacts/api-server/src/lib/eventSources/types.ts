import type { EventItem } from "@workspace/db";

export interface SourceQuery {
  city: string;
  category: string;
  weekOf: Date;
  weekEnd?: Date;
}

export interface SourceAdapter {
  name: string;
  fetchEvents(query: SourceQuery): Promise<EventItem[]>;
}

export type { EventItem };
