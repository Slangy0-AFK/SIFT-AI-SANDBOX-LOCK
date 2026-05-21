import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useSubscription() {
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date', 1),
    initialData: [],
  });

  const plan = subscriptions[0]?.plan || 'free';

  const isPro = plan === 'pro' || plan === 'enterprise';
  const isEnterprise = plan === 'enterprise';

  const canAccess = (requiredPlan) => {
    const order = { free: 0, pro: 1, enterprise: 2 };
    return (order[plan] ?? 0) >= (order[requiredPlan] ?? 0);
  };

  return { plan, isPro, isEnterprise, canAccess, isLoading };
}