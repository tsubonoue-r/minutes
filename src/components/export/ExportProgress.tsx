'use client';

import { memo } from 'react';
import type { ExportStatus } from '@/types/export';

/**
 * Props for ExportProgress component
 */
export interface ExportProgressProps {
  /** Current export status */
  readonly status: ExportStatus;
  /** Progress percentage (0-100) */
  readonly progress: number;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Status step configuration
 */
interface StatusStep {
  readonly key: ExportStatus;
  readonly label: string;
  readonly icon: 'upload' | 'document' | 'permission' | 'check';
}

/**
 * Status steps for export process
 */
const STATUS_STEPS: readonly StatusStep[] = [
  { key: 'uploading', label: 'Uploading...', icon: 'upload' },
  { key: 'processing', label: 'Creating document...', icon: 'document' },
  { key: 'setting_permissions', label: 'Setting permissions...', icon: 'permission' },
  { key: 'completed', label: 'Completed!', icon: 'check' },
] as const;

/**
 * Get the current step index based on status
 */
function getStepIndex(status: ExportStatus): number {
  const index = STATUS_STEPS.findIndex((step) => step.key === status);
  return index >= 0 ? index : -1;
}

/**
 * Spinner component for loading states
 */
function Spinner({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Check icon for completed steps
 */
function CheckIcon({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

/**
 * Step icon component
 */
function StepIcon({
  step: _step,
  isActive,
  isCompleted,
}: {
  readonly step: StatusStep;
  readonly isActive: boolean;
  readonly isCompleted: boolean;
}): JSX.Element {
  // Note: _step.icon can be used for custom icons in the future
  void _step;

  if (isCompleted) {
    return (
      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
        <CheckIcon className="w-5 h-5 text-white" />
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="w-8 h-8 rounded-full bg-lark-primary flex items-center justify-center">
        <Spinner className="w-5 h-5 text-white" />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
      <span className="w-2 h-2 rounded-full bg-gray-400" />
    </div>
  );
}

/**
 * Progress bar component
 */
function ProgressBar({
  progress,
  className = '',
}: {
  readonly progress: number;
  readonly className?: string;
}): JSX.Element {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      className={`w-full bg-gray-200 rounded-full h-2 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Export progress"
    >
      <div
        className="h-full bg-lark-primary transition-all duration-500 ease-out"
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  );
}

/**
 * ExportProgress component
 *
 * @description Displays the progress of an export operation with step indicators
 *
 * @example
 * ```tsx
 * <ExportProgress status="processing" progress={50} />
 * ```
 */
function ExportProgressInner({
  status,
  progress,
  className = '',
}: ExportProgressProps): JSX.Element {
  const currentStepIndex = getStepIndex(status);
  const isError = status === 'error';
  const isIdle = status === 'idle';

  // Don't show anything when idle
  if (isIdle) {
    return <div className={className} />;
  }

  // Error state
  if (isError) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-3 text-red-600">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm font-medium">Export failed</span>
        </div>
        <ProgressBar progress={0} />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              {/* Step icon */}
              <StepIcon step={step} isActive={isActive} isCompleted={isCompleted} />

              {/* Step label */}
              <span
                className={`
                  mt-2 text-xs text-center
                  ${isActive ? 'text-lark-primary font-medium' : ''}
                  ${isCompleted ? 'text-green-600' : ''}
                  ${!isActive && !isCompleted ? 'text-gray-400' : ''}
                `}
              >
                {step.label}
              </span>

              {/* Connector line */}
              {index < STATUS_STEPS.length - 1 && (
                <div
                  className={`
                    absolute h-0.5 w-full max-w-[calc(25%-2rem)]
                    ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                  `}
                  style={{
                    left: `calc(${(index + 1) * 25}% - 1rem)`,
                    top: '1rem',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <ProgressBar progress={progress} />

      {/* Progress percentage */}
      <div className="text-center text-sm text-gray-500">
        {progress}% complete
      </div>
    </div>
  );
}

export const ExportProgress = memo(ExportProgressInner);
