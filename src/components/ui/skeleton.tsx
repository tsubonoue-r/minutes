'use client';

/**
 * スケルトンローディングコンポーネントのprops
 */
export interface SkeletonProps {
  /** カスタムクラス名（幅、高さ、形状などを指定） */
  className?: string;
}

/**
 * スケルトンローディングコンポーネント
 *
 * @description ローディング中のプレースホルダー
 * @example
 * ```tsx
 * // テキスト行
 * <Skeleton className="h-4 w-full" />
 *
 * // 円形アバター
 * <Skeleton className="h-10 w-10 rounded-full" />
 *
 * // カード
 * <Skeleton className="h-32 w-full rounded-lg" />
 * ```
 */
export function Skeleton({ className = '' }: SkeletonProps): JSX.Element {
  return (
    <div
      className={`
        animate-pulse bg-gray-200 rounded
        ${className}
      `}
      aria-hidden="true"
    />
  );
}

/**
 * 会議カードスケルトンのprops
 */
export interface MeetingCardSkeletonProps {
  /** カスタムクラス名 */
  className?: string;
}

/**
 * 会議カードスケルトン
 *
 * @description 会議カードのローディングプレースホルダー
 */
export function MeetingCardSkeleton({
  className = '',
}: MeetingCardSkeletonProps): JSX.Element {
  return (
    <div
      className={`p-4 border border-lark-border rounded-lg bg-white ${className}`}
    >
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* 日時 */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* 参加者 */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

/**
 * 会議リストスケルトンのprops
 */
export interface MeetingListSkeletonProps {
  /** 表示するカード数 */
  count?: number;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * 会議リストスケルトン
 *
 * @description 会議リストのローディングプレースホルダー
 */
export function MeetingListSkeleton({
  count = 5,
  className = '',
}: MeetingListSkeletonProps): JSX.Element {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <MeetingCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * テーブル行スケルトンのprops
 */
export interface TableRowSkeletonProps {
  /** 列数 */
  columns?: number;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * テーブル行スケルトン
 *
 * @description テーブル行のローディングプレースホルダー
 */
export function TableRowSkeleton({
  columns = 5,
  className = '',
}: TableRowSkeletonProps): JSX.Element {
  return (
    <tr className={className}>
      {Array.from({ length: columns }, (_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * テーブルスケルトンのprops
 */
export interface TableSkeletonProps {
  /** 行数 */
  rows?: number;
  /** 列数 */
  columns?: number;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * テーブルスケルトン
 *
 * @description テーブル全体のローディングプレースホルダー
 */
export function TableSkeleton({
  rows = 5,
  columns = 5,
  className = '',
}: TableSkeletonProps): JSX.Element {
  return (
    <table className={`w-full ${className}`}>
      <thead>
        <tr className="border-b border-lark-border">
          {Array.from({ length: columns }, (_, i) => (
            <th key={i} className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  );
}
