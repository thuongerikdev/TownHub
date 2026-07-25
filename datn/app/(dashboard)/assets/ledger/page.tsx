import LedgerReport from '@/components/assets/LedgerReport';
import { RequirePermission } from '@/components/shared';

export default function Page() {
  return (
    <RequirePermission perm="asset.accounting">
      <LedgerReport />
    </RequirePermission>
  );
}
