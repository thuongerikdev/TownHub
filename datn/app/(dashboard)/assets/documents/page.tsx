import DocumentList from '@/components/assets/DocumentList';
import { RequirePermission } from '@/components/shared';

export default function Page() {
  return (
    <RequirePermission perm="asset.accounting">
      <DocumentList />
    </RequirePermission>
  );
}
