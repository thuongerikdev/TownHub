import JournalReport from '@/components/assets/JournalReport';
import { RequirePermission } from '@/components/shared';

export default function Page() {
  return (
    <RequirePermission perm="asset.accounting">
      <JournalReport />
    </RequirePermission>
  );
}
