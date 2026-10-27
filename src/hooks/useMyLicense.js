import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

async function callLicense(payload) {
  const res = await base44.functions.invoke('licenseKey', payload);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

// One place reads and changes the signed-in person's own license, so the
// Settings section and the license page can never drift apart.
export default function useMyLicense() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['my-license'],
    queryFn: () => callLicense({ action: 'mine' }),
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-license'] });

  const revoke = useMutation({
    mutationFn: () => callLicense({ action: 'revoke' }),
    onSuccess: () => {
      toast.success('Your key is revoked. It no longer works anywhere.');
      refresh();
    },
    onError: (error) => toast.error(error.message || 'That did not go through.'),
  });

  const regenerate = useMutation({
    mutationFn: () => callLicense({ action: 'regenerate' }),
    onSuccess: (data) => {
      toast.success(
        data?.mailed
          ? 'A new key is issued and on its way to you. The old one has stopped working.'
          : 'A new key is issued. The old one has stopped working.'
      );
      refresh();
    },
    onError: (error) => toast.error(error.message || 'That did not go through.'),
  });

  return { ...query, revoke, regenerate };
}