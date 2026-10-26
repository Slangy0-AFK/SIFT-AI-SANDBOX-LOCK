import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useKitAccess() {
  const [state, setState] = useState({ loading: true, signedIn: false, paid: false, admin: false, purchases: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await base44.functions.invoke('kitPurchaseStatus', {});
        if (!alive) return;
        setState({
          loading: false,
          signedIn: true,
          paid: Boolean(res.data?.paid),
          admin: Boolean(res.data?.admin),
          purchases: res.data?.purchases || []
        });
      } catch {
        if (alive) setState({ loading: false, signedIn: false, paid: false, admin: false, purchases: [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}