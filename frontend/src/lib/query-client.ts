import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (intentos, error) => {
        if (error instanceof Error && 'status' in error && Number(error.status) < 500) return false;
        return intentos < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
