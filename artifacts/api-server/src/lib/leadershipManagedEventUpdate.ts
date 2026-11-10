import { UpdateLeadershipManagedEventBody } from "@workspace/api-zod";

export type LeadershipManagedEventUpdate =
  | { description: string }
  | { sourceAlumni: string };

export function parseLeadershipManagedEventUpdate(
  tenantSlug: string | undefined,
  body: unknown,
): LeadershipManagedEventUpdate | null {
  const parsed = UpdateLeadershipManagedEventBody.safeParse(body);
  if (!parsed.success) return null;

  const { description, sourceAlumni } = parsed.data;
  if (tenantSlug === "golf") {
    if (sourceAlumni !== undefined || !description?.trim()) return null;
    return { description: description.trim() };
  }

  if (description !== undefined || !sourceAlumni?.trim()) return null;
  return { sourceAlumni: sourceAlumni.trim() };
}
