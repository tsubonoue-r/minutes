'use client';

import { createContext, useCallback, useMemo, useState } from 'react';
import { ToastContainer } from './toast';
import type { ToastData, ToastType } from './toast';

/**
 * トースト通知のコンテキスト値の型定義
 */
export interface ToastContextValue {
  /** 成功通知を表示 */
  success: (message: string, duration?: number) => void;
  /** エラー通知を表示 */
  error: (message: string, duration?: number) => void;
  /** 情報通知を表示 */
  info: (message: string, duration?: number) => void;
  /** 警告通知を表示 */
  warning: (message: string, duration?: number) => void;
  /** 指定IDのトーストを削除 */
  dismiss: (id: string) => void;
  /** 全トーストを削除 */
  dismissAll: () => void;
}

/**
 * ToastProviderのprops
 */
export interface ToastProviderProps {
  /** 子要素 */
  children: React.ReactNode;
  /** 同時表示可能な最大トースト数（デフォルト: 5） */
  maxToasts?: number;
}

/**
 * トースト通知用のReact Context
 *
 * @description グローバルにトースト通知へアクセスするためのContext。
 * useToast() フックを通じて使用する。
 */
export const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * 一意のIDを生成する
 */
let toastCounter = 0;
function generateToastId(): string {
  toastCounter += 1;
  return `toast-${Date.now()}-${String(toastCounter)}`;
}

/**
 * トースト通知プロバイダーコンポーネント
 *
 * @description アプリケーション全体にトースト通知機能を提供するプロバイダー。
 * レイアウトのルートに配置し、useToast() フックを通じて通知を表示する。
 *
 * @example
 * ```tsx
 * // layout.tsx
 * export default function Layout({ children }) {
 *   return (
 *     <ToastProvider maxToasts={5}>
 *       {children}
 *     </ToastProvider>
 *   );
 * }
 * ```
 */
export function ToastProvider({
  children,
  maxToasts = 5,
}: ToastProviderProps): JSX.Element {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      const newToast: ToastData = duration !== undefined
        ? { id: generateToastId(), type, message, duration }
        : { id: generateToastId(), type, message };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // 最大表示数を超えた場合、古いものから削除
        if (updated.length > maxToasts) {
          return updated.slice(updated.length - maxToasts);
        }
        return updated;
      });
    },
    [maxToasts]
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => {
      addToast('success', message, duration);
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      addToast('error', message, duration);
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      addToast('info', message, duration);
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      addToast('warning', message, duration);
    },
    [addToast]
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      success,
      error,
      info,
      warning,
      dismiss,
      dismissAll,
    }),
    [success, error, info, warning, dismiss, dismissAll]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onClose={dismiss} />
    </ToastContext.Provider>
  );
}
