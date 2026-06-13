import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useGetLatestDigest as useGetLatestApi,
  useListDigests as useListDigestsApi,
  useGenerateDigest as useGenerateApi,
  useSendDigest as useSendApi,
  getGetLatestDigestQueryKey,
  getListDigestsQueryKey,
} from "@workspace/api-client-react";

export function useLatestDigest() {
  return useGetLatestApi();
}

export function useAllDigests() {
  return useListDigestsApi();
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
