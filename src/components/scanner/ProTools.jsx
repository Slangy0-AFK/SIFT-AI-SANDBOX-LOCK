import React from 'react';
import TierLocked from '@/components/scanner/TierLocked';
import SavedProfiles from '@/components/scanner/SavedProfiles';
import RecheckFlagged from '@/components/scanner/RecheckFlagged';
import ProReport from '@/components/scanner/ProReport';

export default function ProTools({ unlocked }) {
  if (!unlocked) {
    return (
      <TierLocked
        tier="Harness"
        price="$7 per month"
        includes={['Reusable scan profiles', 'Re-checks of flagged items', 'PDF reports', 'Priority support']}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SavedProfiles />
      <RecheckFlagged />
      <ProReport />
    </div>
  );
}