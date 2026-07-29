import DisposalList from '@/components/assets/DisposalList';
import { RequirePermission } from '@/components/shared';

export default function Page() {
  return (
    <RequirePermission perm="asset.accounting">
      <DisposalList />
    </RequirePermission>
  );
}
