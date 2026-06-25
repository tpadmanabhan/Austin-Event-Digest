import { useQuery } from "@tanstack/react-query";

export interface AdminRsvp {
  id: number;
  eventTitle: string;
  digestId: number;
  email: string;
  name: string | null;
  createdAt: string;
  emailsSent: {
    adminNotified: boolean;
    carpoolMatchCount: number;
  };
}

async function fetchAdminRsvps(): Promise<{ rsvps: AdminRsvp[]; total: number }> {
  const token = sessionStorage.getItem("admin_token");
  const res = await fetch("/api/admin/rsvps", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch carpoolers");
  return res.json() as Promise<{ rsvps: AdminRsvp[]; total: number }>;
}

export function useAdminRsvps() {
  return useQuery({
    queryKey: ["admin-rsvps"],
    queryFn: fetchAdminRsvps,
    refetchInterval: 30_000,
  });
}
