import ChecklistConfig from '@/components/assets/ChecklistConfig';
import { RequirePermission } from '@/components/shared';

export default function Page() {
  return (
    <RequirePermission perm="workorder.create">
      <ChecklistConfig />
    </RequirePermission>
  );
}
