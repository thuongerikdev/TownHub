import DepreciationReport from '@/components/assets/DepreciationReport';
import { RequirePermission } from '@/components/shared';

export default function Page() {
  return (
    <RequirePermission perm="asset.accounting">
      <DepreciationReport />
    </RequirePermission>
  );
}
