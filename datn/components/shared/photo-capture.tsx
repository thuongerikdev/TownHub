"use client";

import { useRef, useState } from "react";
import { Camera, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PhotoItem {
  url: string;
  caption?: string;
}

/**
 * Thu nhỏ ảnh phía client → data URL JPEG gọn nhẹ.
 * Cho phép "chụp ảnh" từ camera điện thoại và lưu trực tiếp dưới dạng chuỗi
 * (hệ thống chưa có endpoint upload file riêng).
 */
async function fileToDataUrl(file: File, maxDim = 1280, quality = 0.7): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
  try {
    const img = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode-failed"));
      img.src = raw;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return raw; // fallback: dùng ảnh gốc
  }
}

export function PhotoCapture({
  title,
  photos,
  onAdd,
  disabled,
  emptyHint = "Chưa có ảnh.",
  className,
}: {
  title?: string;
  photos: PhotoItem[];
  onAdd: (url: string) => Promise<unknown> | unknown;
  disabled?: boolean;
  emptyHint?: string;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd(value: string) {
    const v = value.trim();
    if (!v) return;
    setAdding(true);
    try {
      await onAdd(v);
      setUrl("");
    } finally {
      setAdding(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAdding(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await onAdd(dataUrl);
    } catch {
      toast.error("Không xử lý được ảnh.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface p-4", className)}>
      {title && <h4 className="mb-3 text-sm font-semibold text-foreground">{title}</h4>}

      {photos.length > 0 ? (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <a
              key={`${p.url}-${i}`}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
              title={p.caption}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? `Ảnh ${i + 1}`}
                className="size-full object-cover transition-transform group-hover:scale-105"
              />
              {p.caption && (
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                  {p.caption}
                </span>
              )}
            </a>
          ))}
        </div>
      ) : (
        <p className="mb-3 rounded-lg border border-dashed border-border bg-surface-2 px-3 py-4 text-center text-xs text-muted-foreground">
          {emptyHint}
        </p>
      )}

      {!disabled && (
        <div className="space-y-2">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()} disabled={adding}>
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} Chụp / Chọn ảnh
          </Button>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Hoặc dán URL ảnh…"
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); void handleAdd(url); }
              }}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => handleAdd(url)} disabled={adding || !url.trim()}>
              <Plus className="size-4" /> Thêm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
