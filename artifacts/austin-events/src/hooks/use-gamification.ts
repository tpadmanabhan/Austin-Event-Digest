import {
  useGetGamificationMe,
  useGetGamificationLeaderboard,
  getGetGamificationMeQueryKey,
  getGetGamificationLeaderboardQueryKey,
} from "@workspace/api-client-react";

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useGamificationMe() {
  return useGetGamificationMe({
    request: { headers: getAuthHeaders() },
    query: {
      queryKey: getGetGamificationMeQueryKey(),
      staleTime: 30_000,
      refetchInterval: 60_000,
    },
  });
}

export function useGamificationLeaderboard() {
  return useGetGamificationLeaderboard({
    request: { headers: getAuthHeaders() },
    query: {
      queryKey: getGetGamificationLeaderboardQueryKey(),
      staleTime: 60_000,
    },
  });
}
