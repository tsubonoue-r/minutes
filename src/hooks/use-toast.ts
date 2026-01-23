'use client';

import { useContext } from 'react';
import { ToastContext } from '@/components/ui/toast-provider';
import type { ToastContextValue } from '@/components/ui/toast-provider';

/**
 * トースト通知フックの戻り値の型
 */
export type UseToastReturn = ToastContextValue;

/**
 * トースト通知を操作するカスタムフック
 *
 * @description ToastProviderのContextから通知関数を取得するフック。
 * success / error / info / warning の4種類の通知を表示可能。
 *
 * @throws {Error} ToastProvider外で使用された場合
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { useToast } from '@/hooks/use-toast';
 *
 * function MyComponent() {
 *   const toast = useToast();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       toast.success('保存しました');
 *     } catch {
 *       toast.error('保存に失敗しました');
 *     }
 *   };
 *
 *   return <button onClick={handleSave}>保存</button>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // カスタム表示時間を指定（5秒）
 * toast.info('処理中です...', 5000);
 *
 * // 警告通知
 * toast.warning('入力内容を確認してください');
 *
 * // 手動で閉じる
 * toast.dismissAll();
 * ```
 */
export function useToast(): UseToastReturn {
  const context = useContext(ToastContext);

  if (context === null) {
    throw new Error(
      'useToast must be used within a ToastProvider. ' +
      'Wrap your application with <ToastProvider> in your layout.'
    );
  }

  return context;
}
