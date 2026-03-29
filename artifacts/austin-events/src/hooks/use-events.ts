import { useQueryClient } from "@tanstack/react-query";
import {
  useGetLatestDigest as useGetLatestApi,
  useListDigests as useListDigestsApi,
  useGenerateDigest as useGenerateApi,
  useSendDigest as useSendApi,
  getGetLatestDigestQueryKey,
  getListDigestsQueryKey,
} from "@workspace/api-client-react";

export function useLatestDigest() {
  return useGetLatestApi({
    query: {
      retry: false, // Don't retry heavily if 404
    }
  });
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
