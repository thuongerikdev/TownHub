"use client";

import { useMemo, useState } from "react";
import { Plus, FolderTree, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  assetCategories, type AssetCategoryResponse,
  type CreateAssetCategoryInput, type UpdateAssetCategoryInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockAssetCategories } from "@/lib/mock/asset";
import {
  PageHeader, DataTable, FilterBar, EntityModal, Field, MockBanner, type Column,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function AssetCategories() {
  const q = useApiList<AssetCategoryResponse>(() => assetCategories.getAll(), { mock: mockAssetCategories });
  const cats = q.items;

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssetCategoryResponse | null>(null);
  const [form, setForm] = useState({ code: "", name: "", parentId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<AssetCategoryResponse | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return cats;
    return cats.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s));
  }, [cats, search]);

  function openCreate() {
    setEditing(null);
    setForm({ code: "", name: "", parentId: "" });
    setOpen(true);
  }
  function openEdit(c: AssetCategoryResponse) {
    setEditing(c);
    setForm({ code: c.code, name: c.name, parentId: c.parentId ?? "" });
    setOpen(true);
  }

  async function submit() {
    if (!form.code.trim() || !form.name.trim()) { toast.error("Nhập mã và tên danh mục."); return; }
    const base: CreateAssetCategoryInput = {
      code: form.code.trim(), name: form.name.trim(),
      parentId: form.parentId || undefined,
    };
    setSubmitting(true);
    const res = editing
      ? await assetCategories.update({ ...base, id: editing.id } as UpdateAssetCategoryInput)
      : await assetCategories.create(base);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật danh mục." : "Đã thêm danh mục.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Lưu thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await assetCategories.delete(confirmDel.id);
    if (res.errorCode === 200) {
      toast.success("Đã xoá danh mục.");
      setConfirmDel(null);
      q.refetch();
    } else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<AssetCategoryResponse>[] = [
    { key: "code", header: "Mã", sortable: true, sortAccessor: (c) => c.code, cell: (c) => <span className="font-mono text-xs">{c.code}</span> },
    { key: "name", header: "Tên danh mục", sortable: true, sortAccessor: (c) => c.name, cell: (c) => <span className="font-medium text-foreground">{c.name}</span> },
    { key: "parent", header: "Danh mục cha", cell: (c) => <span className="text-muted-foreground">{c.parentName ?? "—"}</span> },
    { key: "tpl", header: "Checklist mặc định", cell: (c) => <span className="text-muted-foreground">{c.defaultChecklistTemplateName ?? "—"}</span> },
    {
      key: "actions", header: "", align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(c)}><Trash2 className="size-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Danh mục tài sản"
        description={`${cats.length} danh mục thiết bị`}
        icon={FolderTree}
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Thêm danh mục</Button>}
      />
      {q.isMock && <MockBanner />}
      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm danh mục…" />
      <DataTable columns={columns} rows={filtered} getRowId={(c) => c.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Cập nhật danh mục" : "Thêm danh mục"}
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu" : "Tạo"}
      >
        <div className="space-y-4">
          <Field label="Mã danh mục" required>
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="ELEV" />
          </Field>
          <Field label="Tên danh mục" required>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Thang máy" />
          </Field>
          <Field label="Danh mục cha" hint="Để trống nếu là danh mục gốc.">
            <Select value={form.parentId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, parentId: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="— Không có —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Không có —</SelectItem>
                {cats.filter((c) => c.id !== editing?.id).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá danh mục?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá danh mục <strong className="text-foreground">{confirmDel?.name}</strong>?</p>
      </EntityModal>
    </div>
  );
}
