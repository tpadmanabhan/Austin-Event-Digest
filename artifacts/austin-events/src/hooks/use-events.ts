import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useGetLatestDigest as useGetLatestApi,
  useListDigests as useListDigestsApi,
  useGenerateDigest as useGenerateApi,
  useSendDigest as useSendApi,
  getGetLatestDigestQueryKey,
  getListDigestsQueryKey,
} from "@workspace/api-client-react";
import { useTenant } from "@/contexts/tenant-context";

export function useLatestDigest() {
  return useGetLatestApi();
}

export function useAllDigests() {
  return useListDigestsApi();
}

export type LeadershipManagedEvent = {
  id: number;
  managedEventId: number;
  title: string;
  date: string;
  startDate: string;
  endDate?: string | null;
  timezone: string;
  venue: string;
  venueAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
  description: string;
  link?: string | null;
  category: string;
  source?: string | null;
  sourceName?: string;
  sourceUrl?: string | null;
  sourceAlumni: string;
  organizer?: string | null;
  isPersistentManaged: true;
};

export function useLeadershipManagedEvents(enabled = true) {
  return useQuery({
    queryKey: ["leadership-managed-events"],
    queryFn: async () => {
      const response = await fetch("/api/events/leadership-managed");
      if (!response.ok) throw new Error("Unable to load alumni-sourced events.");
      return response.json() as Promise<{ events: LeadershipManagedEvent[] }>;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export type CommunityManagedEvent = LeadershipManagedEvent;

export function useCommunityManagedEvents(enabled = true) {
  const tenant = useTenant();
  return useQuery({
    queryKey: ["community-managed-events", tenant.slug],
    queryFn: async () => {
      const response = await fetch("/api/events/leadership-managed");
      if (!response.ok) throw new Error("Unable to load approved community events.");
      return response.json() as Promise<{ events: CommunityManagedEvent[] }>;
    },
    enabled: enabled && ["leadershipaustin", "golf"].includes(tenant.slug),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useGenerateDigest() {
  const queryClient = useQueryClient();
  return useGenerateApi({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLatestDigestQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListDigestsQueryKey() });
      },
    },
  });
}

export function useSendDigest() {
  const queryClient = useQueryClient();
  return useSendApi({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDigestsQueryKey() });
      },
    },
  });
}

export function useDeleteDigest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (digestId: number) => {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch(`/api/events/digest/${digestId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).message || `Failed to delete digest`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetLatestDigestQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListDigestsQueryKey() });
    },
  });
}
