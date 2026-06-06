import { useSubscription } from '@/hooks/useSubscription';

const PLAN_LABELS = { pro: 'Pro', enterprise: 'Enterprise' };

export default function FeatureGate({ requiredPlan = 'pro', children, featureName }) {
  const { canAccess, isLoading } = useSubscription();

  if (isLoading) return null;
  
  // BETA MODE: Grant access to all features regardless of plan
  // When ready to go live, uncomment the plan check below
  return children;
  
  // LIVE MODE (uncomment when ready):
  // if (canAccess(requiredPlan)) return children;
  // return (
  //   <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
  //     <div className="p-4 rounded-full bg-secondary border border-border mb-4">
  //       <Lock className="w-8 h-8 text-muted-foreground" />
  //     </div>
  //     <h3 className="font-mono text-sm font-bold text-foreground mb-1">
  //       {PLAN_LABELS[requiredPlan]} Feature
  //     </h3>
  //     {featureName && (
  //       <p className="font-mono text-xs text-muted-foreground mb-1">{featureName}</p>
  //     )}
  //     <p className="font-mono text-[10px] text-muted-foreground mb-5 max-w-xs">
  //       Upgrade to <span className="text-primary font-bold">{PLAN_LABELS[requiredPlan]}</span> to unlock this feature.
  //     </p>
  //     <Button asChild size="sm" className="font-mono text-xs">
  //       <Link to="/subscription">Upgrade Plan</Link>
  //     </Button>
  //   </div>
  // );
}