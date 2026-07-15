"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { assetDocuments, type AssetDocumentResponse } from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import {
  PageHeader, DataTable, ToneBadge, EntityModal, type Column,
} from "@/components/shared";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";

const TYPE_META: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" }> = {
  GHI_TANG: { label: "Ghi tăng", tone: "success" },
  KHAU_HAO: { label: "Khấu hao", tone: "warning" },
  THANH_LY: { label: "Thanh lý", tone: "danger" },
};

function typeLabel(t: string) { return TYPE_META[t]?.label ?? t; }

export default function DocumentList() {
  const [type, setType] = useState<string>("ALL");
  const [selected, setSelected] = useState<AssetDocumentResponse | null>(null);

  const q = useApiList<AssetDocumentResponse>(
    () => assetDocuments.getAll(type === "ALL" ? undefined : type),
    { deps: [type] },
  );

  const columns: Column<AssetDocumentResponse>[] = [
    { key: "code", header: "Số chứng từ", sortable: true, sortAccessor: (d) => d.documentCode, cell: (d) => <span className="font-mono text-xs">{d.documentCode}</span> },
    { key: "type", header: "Loại", cell: (d) => <ToneBadge tone={TYPE_META[d.documentType]?.tone ?? "info"}>{typeLabel(d.documentType)}</ToneBadge> },
    { key: "date", header: "Ngày lập", sortable: true, sortAccessor: (d) => d.documentDate, cell: (d) => formatDate(d.documentDate) },
    { key: "desc", header: "Diễn giải", cell: (d) => <span className="text-sm text-muted-foreground">{d.description}</span> },
    { key: "amount", header: "Tổng tiền", align: "right", sortable: true, sortAccessor: (d) => d.totalAmount, cell: (d) => <span className="font-medium">{formatCurrency(d.totalAmount)}</span> },
    { key: "lines", header: "Số bút toán", align: "right", cell: (d) => d.lines.length },
  ];

  return (
    <div>
      <PageHeader
        title="Chứng từ kế toán"
        description="Chứng từ ghi tăng / khấu hao / thanh lý tài sản (định khoản Nợ - Có)"
        icon={FileText}
        actions={
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả loại</SelectItem>
              <SelectItem value="GHI_TANG">Ghi tăng</SelectItem>
              <SelectItem value="KHAU_HAO">Khấu hao</SelectItem>
              <SelectItem value="THANH_LY">Thanh lý</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable
        columns={columns}
        rows={q.items}
        getRowId={(d) => d.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
        onRowClick={(d) => setSelected(d)}
      />

      <EntityModal
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected ? `Chứng từ ${selected.documentCode}` : ""}
        description={selected ? `${typeLabel(selected.documentType)} · ${formatDate(selected.documentDate)}` : ""}
        size="lg"
        footer={<></>}
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-foreground">{selected.description}</p>
              <p className="mt-1 text-muted-foreground">Tổng tiền: <span className="font-medium text-foreground">{formatCurrency(selected.totalAmount)}</span></p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Diễn giải</th>
                    <th className="px-3 py-2 text-center">TK Nợ</th>
                    <th className="px-3 py-2 text-center">TK Có</th>
                    <th className="px-3 py-2 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        {l.description}
                        {l.assetCode && <span className="ml-1 font-mono text-xs text-muted-foreground">({l.assetCode})</span>}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">{l.debitAccount ?? "—"}</td>
                      <td className="px-3 py-2 text-center font-mono">{l.creditAccount ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </EntityModal>
    </div>
  );
}
