import { useQueryClient } from "@tanstack/react-query";
import {
  useSubscribeToNewsletter as useSubscribeApi,
  useUnsubscribeFromNewsletter as useUnsubscribeApi,
  useGetSubscribers as useGetSubscribersApi,
  getGetSubscribersQueryKey,
} from "@workspace/api-client-react";

export function useNewsletterSubscriptions() {
  return useGetSubscribersApi();
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useSubscribeApi({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSubscribersQueryKey() });
      },
    },
  });
}

export function useUnsubscribe() {
  const queryClient = useQueryClient();
  return useUnsubscribeApi({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSubscribersQueryKey() });
      },
    },
  });
}
