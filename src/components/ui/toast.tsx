'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * トースト通知の種類
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * トースト通知のデータ構造
 */
export interface ToastData {
  /** 一意の識別子 */
  id: string;
  /** 通知の種類 */
  type: ToastType;
  /** 表示メッセージ */
  message: string;
  /** 自動非表示までの時間（ミリ秒） */
  duration?: number;
}

/**
 * Toast単体のprops
 */
export interface ToastItemProps {
  /** トーストデータ */
  toast: ToastData;
  /** 閉じるハンドラ */
  onClose: (id: string) => void;
}

/**
 * ToastContainerのprops
 */
export interface ToastContainerProps {
  /** 表示するトースト一覧 */
  toasts: ToastData[];
  /** 閉じるハンドラ */
  onClose: (id: string) => void;
}

/**
 * トーストの種類に応じたスタイルを取得
 */
function getToastStyles(type: ToastType): string {
  const styles: Record<ToastType, string> = {
    success: 'bg-green-50 border-green-400 text-green-800',
    error: 'bg-red-50 border-red-400 text-red-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
  };
  return styles[type];
}

/**
 * トーストの種類に応じたアイコンを取得
 */
function getToastIcon(type: ToastType): string {
  const icons: Record<ToastType, string> = {
    success: '\u2713',
    error: '\u2717',
    info: '\u2139',
    warning: '\u26A0',
  };
  return icons[type];
}

/**
 * トーストの種類に応じたアイコン背景色を取得
 */
function getIconBgStyles(type: ToastType): string {
  const styles: Record<ToastType, string> = {
    success: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
    warning: 'bg-yellow-100 text-yellow-600',
  };
  return styles[type];
}

/**
 * 閉じるボタンのスタイルを取得
 */
function getCloseButtonStyles(type: ToastType): string {
  const styles: Record<ToastType, string> = {
    success: 'text-green-500 hover:text-green-700 focus:ring-green-400',
    error: 'text-red-500 hover:text-red-700 focus:ring-red-400',
    info: 'text-blue-500 hover:text-blue-700 focus:ring-blue-400',
    warning: 'text-yellow-500 hover:text-yellow-700 focus:ring-yellow-400',
  };
  return styles[type];
}

/**
 * 個別のトースト通知コンポーネント
 *
 * @description 成功・エラー・情報・警告の4種類のトースト通知を表示する。
 * 指定した時間（デフォルト3秒）で自動非表示になり、手動で閉じることも可能。
 *
 * @example
 * ```tsx
 * <ToastItem
 *   toast={{ id: '1', type: 'success', message: '保存しました' }}
 *   onClose={(id) => removeToast(id)}
 * />
 * ```
 */
export function ToastItem({ toast, onClose }: ToastItemProps): JSX.Element {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  const handleClose = useCallback((): void => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 200);
  }, [onClose, toast.id]);

  useEffect((): (() => void) => {
    // Trigger entrance animation
    const enterTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    return (): void => { clearTimeout(enterTimer); };
  }, []);

  useEffect((): (() => void) => {
    const duration = toast.duration ?? 3000;
    const autoCloseTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return (): void => { clearTimeout(autoCloseTimer); };
  }, [toast.duration, handleClose]);

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`
        w-full max-w-sm border-l-4 rounded-lg shadow-lg pointer-events-auto
        transition-all duration-200 ease-in-out
        ${getToastStyles(toast.type)}
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold
            ${getIconBgStyles(toast.type)}
          `}
          aria-hidden="true"
        >
          {getToastIcon(toast.type)}
        </div>

        {/* Message */}
        <p className="flex-1 text-sm font-medium leading-5 pt-0.5">
          {toast.message}
        </p>

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className={`
            flex-shrink-0 inline-flex items-center justify-center w-5 h-5
            rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1
            transition-colors duration-150
            ${getCloseButtonStyles(toast.type)}
          `}
          aria-label="閉じる"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * トースト通知のコンテナコンポーネント
 *
 * @description 画面右上にトースト通知をスタック表示する。
 * 複数の通知が同時に表示される場合は上から順に積み重なる。
 *
 * @example
 * ```tsx
 * <ToastContainer toasts={toasts} onClose={removeToast} />
 * ```
 */
export function ToastContainer({ toasts, onClose }: ToastContainerProps): JSX.Element {
  return (
    <div
      aria-label="通知"
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
