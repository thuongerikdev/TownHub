import AccountingReports from '@/components/assets/AccountingReports';
import { RequirePermission } from '@/components/shared';

export default function Page() {
  return (
    <RequirePermission perm="asset.accounting">
      <AccountingReports />
    </RequirePermission>
  );
}
