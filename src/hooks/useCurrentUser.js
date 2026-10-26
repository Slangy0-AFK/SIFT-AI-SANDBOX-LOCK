import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// The signed-in account, as the pages need it. A guest resolves to null rather
// than an error, so a page can say "sign in" instead of breaking.
export default function useCurrentUser() {
  const { data, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 60_000
  });

  return { user: data || null, isLoading };
}