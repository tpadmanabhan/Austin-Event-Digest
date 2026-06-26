import {
  useGetGamificationMe,
  useGetGamificationLeaderboard,
} from "@workspace/api-client-react";

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useGamificationMe() {
  return useGetGamificationMe({
    request: { headers: getAuthHeaders() },
    query: { staleTime: 30_000, refetchInterval: 60_000 },
  });
}

export function useGamificationLeaderboard() {
  return useGetGamificationLeaderboard({
    request: { headers: getAuthHeaders() },
    query: { staleTime: 60_000 },
  });
}
