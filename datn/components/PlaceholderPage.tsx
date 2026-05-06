"use client";

import { motion } from "motion/react";
import { Wrench } from "lucide-react";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 p-8"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">{title}</h1>
        <p className="mt-2 text-slate-500">{description}</p>
      </div>

      <div className="h-96 rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
          <Wrench className="w-8 h-8 text-indigo-500" />
        </div>
        <p className="text-sm font-medium">Module đang trong quá trình phát triển</p>
        <p className="text-xs mt-1 max-w-sm text-center">
          Giao diện cho tính năng &quot;{title}&quot; sẽ sớm được cập nhật trong phiên bản tiếp theo.
        </p>
      </div>
    </motion.div>
  );
}
