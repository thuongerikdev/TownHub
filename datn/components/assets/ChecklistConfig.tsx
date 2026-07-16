"use client";

import { useState } from "react";
import { ListChecks, Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  checklistTemplates, assetCategories,
  type ChecklistTemplateResponse, type ChecklistTemplateItemResponse,
  type AssetCategoryResponse,
  type CreateChecklistTemplateInput, type CreateChecklistItemInput,
} from "@/lib/api";
import { useApi, useApiList } from "@/lib/use-api";
import {
  PageHeader, DataTable, EntityModal, Field, ToneBadge, type Column,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ITEM_TYPES = [
  { v: "BOOLEAN", l: "Đạt / Không đạt" },
  { v: "NUMBER", l: "Số đo" },
  { v: "TEXT", l: "Ghi chú" },
];
const itemTypeLabel = (t: string) => ITEM_TYPES.find((x) => x.v === t)?.l ?? t;

const emptyTpl = { code: "", name: "", categoryId: "" };
const emptyItem = { itemLabel: "", itemType: "BOOLEAN", itemCode: "", expectedValue: "", description: "", sortOrder: "", isRequired: true };

export default function ChecklistConfig() {
  const tplQ = useApiList<ChecklistTemplateResponse>(() => checklistTemplates.getAll());
  const catsQ = useApiList<AssetCategoryResponse>(() => assetCategories.getAll());

  const [selected, setSelected] = useState<ChecklistTemplateResponse | null>(null);
  const itemsQ = useApi<ChecklistTemplateItemResponse[]>(
    () => checklistTemplates.getItems(selected!.id),
    { deps: [selected?.id ?? ""], enabled: !!selected },
  );

  // ── Template modal ──
  const [tplOpen, setTplOpen] = useState(false);
  const [tplEditing, setTplEditing] = useState<ChecklistTemplateResponse | null>(null);
  const [tplForm, setTplForm] = useState(emptyTpl);
  const [tplSaving, setTplSaving] = useState(false);

  // ── Item modal ──
  const [itemOpen, setItemOpen] = useState(false);
  const [itemEditing, setItemEditing] = useState<ChecklistTemplateItemResponse | null>(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [itemSaving, setItemSaving] = useState(false);

  // ── Delete confirm ──
  const [delTpl, setDelTpl] = useState<ChecklistTemplateResponse | null>(null);
  const [delItem, setDelItem] = useState<ChecklistTemplateItemResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreateTpl() { setTplEditing(null); setTplForm(emptyTpl); setTplOpen(true); }
  function openEditTpl(t: ChecklistTemplateResponse) { setTplEditing(t); setTplForm({ code: t.code, name: t.name, categoryId: t.categoryId ?? "" }); setTplOpen(true); }

  async function saveTpl() {
    if (!tplForm.code.trim()) { toast.error("Nhập mã mẫu checklist."); return; }
    if (!tplForm.name.trim()) { toast.error("Nhập tên mẫu checklist."); return; }
    setTplSaving(true);
    const body: CreateChecklistTemplateInput = {
      code: tplForm.code.trim(), name: tplForm.name.trim(), categoryId: tplForm.categoryId || undefined,
    };
    const res = tplEditing
      ? await checklistTemplates.update({ ...body, id: tplEditing.id })
      : await checklistTemplates.create(body);
    setTplSaving(false);
    if (res.errorCode === 200) {
      toast.success(tplEditing ? "Đã cập nhật mẫu." : "Đã tạo mẫu checklist.");
      setTplOpen(false); tplQ.refetch();
    } else toast.error(res.errorMessage || "Lưu mẫu thất bại.");
  }

  function openCreateItem() {
    if (!selected) return;
    const nextOrder = (itemsQ.data ?? []).reduce((m, i) => Math.max(m, i.sortOrder), 0) + 1;
    setItemEditing(null); setItemForm({ ...emptyItem, sortOrder: String(nextOrder) }); setItemOpen(true);
  }
  function openEditItem(it: ChecklistTemplateItemResponse) {
    setItemEditing(it);
    setItemForm({
      itemLabel: it.itemLabel, itemType: it.itemType, itemCode: it.itemCode ?? "",
      expectedValue: it.expectedValue ?? "", description: it.description ?? "",
      sortOrder: String(it.sortOrder), isRequired: it.isRequired,
    });
    setItemOpen(true);
  }

  async function saveItem() {
    if (!selected) return;
    if (!itemForm.itemLabel.trim()) { toast.error("Nhập tên hạng mục."); return; }
    setItemSaving(true);
    const body: CreateChecklistItemInput = {
      templateId: selected.id, itemType: itemForm.itemType, itemLabel: itemForm.itemLabel.trim(),
      itemCode: itemForm.itemCode.trim() || undefined, description: itemForm.description.trim() || undefined,
      expectedValue: itemForm.expectedValue.trim() || undefined,
      sortOrder: itemForm.sortOrder ? Number(itemForm.sortOrder) : undefined,
      isRequired: itemForm.isRequired,
    };
    const res = itemEditing
      ? await checklistTemplates.updateItem({ ...body, id: itemEditing.id })
      : await checklistTemplates.addItem(body);
    setItemSaving(false);
    if (res.errorCode === 200) {
      toast.success(itemEditing ? "Đã cập nhật hạng mục." : "Đã thêm hạng mục.");
      setItemOpen(false); itemsQ.refetch();
    } else toast.error(res.errorMessage || "Lưu hạng mục thất bại.");
  }

  async function doDelete() {
    setDeleting(true);
    if (delTpl) {
      const res = await checklistTemplates.delete(delTpl.id);
      setDeleting(false);
      if (res.errorCode === 200) {
        toast.success("Đã xoá mẫu checklist.");
        if (selected?.id === delTpl.id) setSelected(null);
        setDelTpl(null); tplQ.refetch();
      } else toast.error(res.errorMessage || "Xoá thất bại (mẫu có thể đang được dùng).");
    } else if (delItem) {
      const res = await checklistTemplates.deleteItem(delItem.id);
      setDeleting(false);
      if (res.errorCode === 200) { toast.success("Đã xoá hạng mục."); setDelItem(null); itemsQ.refetch(); }
      else toast.error(res.errorMessage || "Xoá hạng mục thất bại.");
    }
  }

  const tplCols: Column<ChecklistTemplateResponse>[] = [
    { key: "code", header: "Mã", sortable: true, sortAccessor: (t) => t.code, cell: (t) => <span className="font-mono text-xs">{t.code}</span> },
    { key: "name", header: "Tên mẫu", sortable: true, sortAccessor: (t) => t.name, cell: (t) => <span className="font-medium text-foreground">{t.name}</span> },
    { key: "cat", header: "Danh mục áp dụng", cell: (t) => t.categoryName ? <ToneBadge tone="info">{t.categoryName}</ToneBadge> : <span className="text-muted-foreground">—</span> },
    {
      key: "act", header: "", align: "right",
      cell: (t) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEditTpl(t)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setDelTpl(t)}><Trash2 className="size-4" /></Button>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      ),
    },
  ];

  const items = [...(itemsQ.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <PageHeader
        title="Cấu hình Checklist"
        description="Quản lý mẫu checklist bảo trì & các hạng mục kiểm tra, gắn theo danh mục tài sản"
        icon={ListChecks}
        actions={<Button onClick={openCreateTpl}><Plus className="size-4" /> Tạo mẫu checklist</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Mẫu checklist</h2>
          <DataTable
            columns={tplCols}
            rows={tplQ.items}
            getRowId={(t) => t.id}
            loading={tplQ.loading}
            error={tplQ.error}
            onRetry={tplQ.refetch}
            onRowClick={(t) => setSelected(t)}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              {selected ? `Hạng mục · ${selected.name}` : "Hạng mục kiểm tra"}
            </h2>
            {selected && <Button size="sm" onClick={openCreateItem}><Plus className="size-4" /> Thêm hạng mục</Button>}
          </div>

          {!selected ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Chọn một mẫu checklist bên trái để xem & sửa hạng mục.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {itemsQ.loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Đang tải…</p>
              ) : items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Mẫu này chưa có hạng mục. Bấm “Thêm hạng mục”.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Hạng mục</th>
                      <th className="px-3 py-2 text-left">Loại</th>
                      <th className="px-3 py-2 text-left">Chuẩn</th>
                      <th className="px-3 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={it.id} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2">
                          {it.itemLabel}
                          {it.isRequired && <span className="ml-1 text-xs text-warning">*</span>}
                          {it.description && <span className="block text-xs text-muted-foreground">{it.description}</span>}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{itemTypeLabel(it.itemType)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{it.expectedValue ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEditItem(it)}><Pencil className="size-4" /></Button>
                            <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setDelItem(it)}><Trash2 className="size-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Template modal */}
      <EntityModal
        open={tplOpen} onOpenChange={setTplOpen}
        title={tplEditing ? "Sửa mẫu checklist" : "Tạo mẫu checklist"}
        size="md" onSubmit={saveTpl} submitting={tplSaving} submitLabel={tplEditing ? "Lưu" : "Tạo"}
      >
        <div className="space-y-4">
          <Field label="Mã mẫu" required><Input value={tplForm.code} onChange={(e) => setTplForm((f) => ({ ...f, code: e.target.value }))} placeholder="CL-HVAC" className="font-mono" /></Field>
          <Field label="Tên mẫu" required><Input value={tplForm.name} onChange={(e) => setTplForm((f) => ({ ...f, name: e.target.value }))} placeholder="Checklist bảo trì điều hoà" /></Field>
          <Field label="Danh mục tài sản áp dụng" hint="Tài sản thuộc danh mục này sẽ dùng mẫu checklist này.">
            <Select value={tplForm.categoryId || "none"} onValueChange={(v) => setTplForm((f) => ({ ...f, categoryId: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Không gắn —</SelectItem>
                {catsQ.items.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </EntityModal>

      {/* Item modal */}
      <EntityModal
        open={itemOpen} onOpenChange={setItemOpen}
        title={itemEditing ? "Sửa hạng mục" : "Thêm hạng mục"}
        size="md" onSubmit={saveItem} submitting={itemSaving} submitLabel={itemEditing ? "Lưu" : "Thêm"}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tên hạng mục" required className="col-span-2"><Input value={itemForm.itemLabel} onChange={(e) => setItemForm((f) => ({ ...f, itemLabel: e.target.value }))} placeholder="Đo áp suất gas (bar)" /></Field>
          <Field label="Loại kết quả">
            <Select value={itemForm.itemType} onValueChange={(v) => setItemForm((f) => ({ ...f, itemType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ITEM_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Thứ tự"><Input type="number" value={itemForm.sortOrder} onChange={(e) => setItemForm((f) => ({ ...f, sortOrder: e.target.value }))} placeholder="1" /></Field>
          <Field label="Mã hạng mục"><Input value={itemForm.itemCode} onChange={(e) => setItemForm((f) => ({ ...f, itemCode: e.target.value }))} placeholder="CL-HVAC-01" className="font-mono" /></Field>
          <Field label="Giá trị chuẩn"><Input value={itemForm.expectedValue} onChange={(e) => setItemForm((f) => ({ ...f, expectedValue: e.target.value }))} placeholder="8-10 / OK" /></Field>
          <Field label="Mô tả" className="col-span-2"><Textarea rows={2} value={itemForm.description} onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))} /></Field>
          <label className="col-span-2 flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={itemForm.isRequired} onChange={(e) => setItemForm((f) => ({ ...f, isRequired: e.target.checked }))} className="size-4 accent-brand" />
            Bắt buộc kiểm tra
          </label>
        </div>
      </EntityModal>

      {/* Delete confirm */}
      <EntityModal
        open={!!delTpl || !!delItem}
        onOpenChange={(o) => { if (!o) { setDelTpl(null); setDelItem(null); } }}
        title={delTpl ? "Xoá mẫu checklist?" : "Xoá hạng mục?"}
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => { setDelTpl(null); setDelItem(null); }} disabled={deleting}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete} disabled={deleting}>{deleting ? "Đang xoá…" : "Xoá"}</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {delTpl
            ? <>Xoá mẫu <strong className="text-foreground">{delTpl.name}</strong> ({delTpl.code}) cùng toàn bộ hạng mục? Không thể hoàn tác.</>
            : <>Xoá hạng mục <strong className="text-foreground">{delItem?.itemLabel}</strong>?</>}
        </p>
      </EntityModal>
    </div>
  );
}
