"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResponse } from "@/lib/api";

// Cờ bật dữ liệu mẫu khi backend chưa sẵn sàng. Mặc định tắt.
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isMock: boolean;
  refetch: () => void;
}

interface Options<T> {
  mock?: T | (() => T);
  deps?: unknown[];
  enabled?: boolean;
}

function resolveMock<T>(mock?: T | (() => T)): T | undefined {
  return typeof mock === "function" ? (mock as () => T)() : mock;
}

/**
 * Gọi 1 endpoint trả ApiResponse<T>. Quản lý loading/error, và khi lỗi kết nối
 * + USE_MOCK bật thì degrade sang dữ liệu mẫu (isMock=true) để xem được UI.
 */
export function useApi<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  options: Options<T> = {},
): ApiState<T> {
  const { mock, deps = [], enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [tick, setTick] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mockRef = useRef(mock);
  mockRef.current = mock;

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setIsMock(false);

    fetcherRef.current()
      .then((res) => {
        if (cancelled) return;
        if (res.errorCode === 200) {
          setData(res.data);
          setIsMock(false);
        } else if (USE_MOCK && mockRef.current !== undefined) {
          setData(resolveMock(mockRef.current) ?? null);
          setIsMock(true);
        } else {
          setError(res.errorMessage || "Không tải được dữ liệu.");
          setData(null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        if (USE_MOCK && mockRef.current !== undefined) {
          setData(resolveMock(mockRef.current) ?? null);
          setIsMock(true);
        } else {
          setError(e?.message || "Lỗi không xác định.");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, enabled, ...deps]);

  return { data, loading, error, isMock, refetch };
}

/** Biến thể cho danh sách: data luôn là mảng (mặc định []). */
export function useApiList<T>(
  fetcher: () => Promise<ApiResponse<T[]>>,
  options: Options<T[]> = {},
): ApiState<T[]> & { items: T[] } {
  const state = useApi<T[]>(fetcher, options);
  return { ...state, items: state.data ?? [] };
}
