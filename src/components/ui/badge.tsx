'use client';

/**
 * バッジのバリアント
 */
export type BadgeVariant = 'default' | 'success' | 'warning' | 'error';

/**
 * バッジコンポーネントのprops
 */
export interface BadgeProps {
  /** バッジのバリアント */
  variant?: BadgeVariant;
  /** 表示するテキスト */
  children: React.ReactNode;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * バリアントに応じたスタイルを取得
 */
function getVariantStyles(variant: BadgeVariant): string {
  const styles: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  };
  return styles[variant];
}

/**
 * バッジコンポーネント
 *
 * @description 会議ステータスなどを表示するバッジ
 * @example
 * ```tsx
 * <Badge variant="success">完了</Badge>
 * <Badge variant="warning">進行中</Badge>
 * <Badge variant="error">キャンセル</Badge>
 * ```
 */
export function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps): JSX.Element {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${getVariantStyles(variant)}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

/**
 * 会議ステータス用のプリセットバッジ
 */
export interface StatusBadgeProps {
  /** ステータス */
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  /** カスタムクラス名 */
  className?: string;
}

/**
 * ステータスに応じたラベルとバリアントを取得
 */
function getStatusConfig(
  status: StatusBadgeProps['status']
): { label: string; variant: BadgeVariant } {
  const config: Record<
    StatusBadgeProps['status'],
    { label: string; variant: BadgeVariant }
  > = {
    scheduled: { label: '予定', variant: 'default' },
    in_progress: { label: '進行中', variant: 'warning' },
    completed: { label: '完了', variant: 'success' },
    cancelled: { label: 'キャンセル', variant: 'error' },
  };
  return config[status];
}

/**
 * 会議ステータスバッジコンポーネント
 *
 * @example
 * ```tsx
 * <StatusBadge status="completed" />
 * ```
 */
export function StatusBadge({
  status,
  className = '',
}: StatusBadgeProps): JSX.Element {
  const { label, variant } = getStatusConfig(status);

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
