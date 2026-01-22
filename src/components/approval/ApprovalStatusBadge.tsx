'use client';

/**
 * ApprovalStatusBadge Component
 *
 * Displays the current approval status with appropriate styling.
 *
 * @module components/approval/ApprovalStatusBadge
 */

import {
  type ApprovalStatus,
  APPROVAL_STATUS,
  getStatusLabel,
} from '@/types/approval';

/**
 * Badge variant type for styling
 */
type BadgeVariant = 'default' | 'warning' | 'success' | 'error';

/**
 * Props for ApprovalStatusBadge component
 */
export interface ApprovalStatusBadgeProps {
  /** Current approval status */
  status: ApprovalStatus;
  /** Display language */
  language?: 'ja' | 'en';
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Get variant based on approval status
 */
function getVariant(status: ApprovalStatus): BadgeVariant {
  switch (status) {
    case APPROVAL_STATUS.DRAFT:
      return 'default';
    case APPROVAL_STATUS.PENDING_APPROVAL:
      return 'warning';
    case APPROVAL_STATUS.APPROVED:
      return 'success';
    case APPROVAL_STATUS.REJECTED:
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Get variant styles
 */
function getVariantStyles(variant: BadgeVariant): string {
  const styles: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
  };
  return styles[variant];
}

/**
 * Get size styles
 */
function getSizeStyles(size: 'sm' | 'md' | 'lg'): string {
  const styles: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };
  return styles[size];
}

/**
 * Get status icon
 */
function getStatusIcon(status: ApprovalStatus): string {
  switch (status) {
    case APPROVAL_STATUS.DRAFT:
      return ''; // Draft icon (document)
    case APPROVAL_STATUS.PENDING_APPROVAL:
      return ''; // Clock icon
    case APPROVAL_STATUS.APPROVED:
      return ''; // Check icon
    case APPROVAL_STATUS.REJECTED:
      return ''; // X icon
    default:
      return '';
  }
}

/**
 * ApprovalStatusBadge Component
 *
 * Displays the approval status with appropriate color coding and icon.
 *
 * @example
 * ```tsx
 * <ApprovalStatusBadge status="pending_approval" language="ja" />
 * // Renders: [Clock] 承認待ち
 *
 * <ApprovalStatusBadge status="approved" language="en" size="lg" />
 * // Renders: [Check] Approved
 * ```
 */
export function ApprovalStatusBadge({
  status,
  language = 'ja',
  className = '',
  size = 'md',
}: ApprovalStatusBadgeProps): JSX.Element {
  const variant = getVariant(status);
  const label = getStatusLabel(status, language);
  const icon = getStatusIcon(status);

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${getVariantStyles(variant)}
        ${getSizeStyles(size)}
        ${className}
      `}
      role="status"
      aria-label={label}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </span>
  );
}

/**
 * Preset badge for minutes approval status
 */
export interface MinutesApprovalStatusProps {
  /** Minutes ID */
  minutesId: string;
  /** Current status */
  status: ApprovalStatus;
  /** Click handler */
  onClick?: () => void;
  /** Display language */
  language?: 'ja' | 'en';
}

/**
 * MinutesApprovalStatus Component
 *
 * A clickable badge showing the approval status of specific minutes.
 *
 * @example
 * ```tsx
 * <MinutesApprovalStatus
 *   minutesId="min_123"
 *   status="pending_approval"
 *   onClick={() => openApprovalDialog()}
 * />
 * ```
 */
export function MinutesApprovalStatus({
  minutesId,
  status,
  onClick,
  language = 'ja',
}: MinutesApprovalStatusProps): JSX.Element {
  const isClickable = onClick !== undefined;

  const handleClick = (): void => {
    if (onClick !== undefined) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if ((event.key === 'Enter' || event.key === ' ') && onClick !== undefined) {
      event.preventDefault();
      onClick();
    }
  };

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
        aria-label={`View approval details for minutes ${minutesId}`}
      >
        <ApprovalStatusBadge status={status} language={language} />
      </button>
    );
  }

  return <ApprovalStatusBadge status={status} language={language} />;
}
