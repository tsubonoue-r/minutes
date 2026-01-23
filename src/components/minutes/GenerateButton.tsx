'use client';

import { memo, useCallback } from 'react';

/**
 * Generation state type
 */
export type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error';

/**
 * Generation state
 */
export interface GenerationState {
  /** Current status */
  readonly status: GenerationStatus;
  /** Progress percentage (0-100) */
  readonly progress?: number | undefined;
  /** Current step description */
  readonly currentStep?: string | undefined;
  /** Error message */
  readonly error?: string | undefined;
}

/**
 * Props for GenerateButton component
 */
export interface GenerateButtonProps {
  /** Current generation state */
  readonly state: GenerationState;
  /** Callback when generate button is clicked */
  readonly onGenerate: () => void;
  /** Callback when regenerate button is clicked */
  readonly onRegenerate?: (() => void) | undefined;
  /** Whether minutes already exist (shows regenerate option) */
  readonly hasExistingMinutes?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Spinner component
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
 * Progress bar component
 */
function ProgressBar({
  progress,
  className = '',
}: {
  readonly progress: number;
  readonly className?: string;
}): JSX.Element {
  return (
    <div
      className={`w-full bg-gray-200 rounded-full h-2 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-lark-primary transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

/**
 * GenerateButton component
 *
 * @description Button to trigger AI minutes generation with progress display
 * @example
 * ```tsx
 * <GenerateButton
 *   state={{ status: 'idle' }}
 *   onGenerate={handleGenerate}
 *   onRegenerate={handleRegenerate}
 *   hasExistingMinutes={false}
 * />
 * ```
 */
function GenerateButtonInner({
  state,
  onGenerate,
  onRegenerate,
  hasExistingMinutes = false,
  className = '',
}: GenerateButtonProps): JSX.Element {
  const handleClick = useCallback(() => {
    if (state.status === 'generating') return;
    onGenerate();
  }, [state.status, onGenerate]);

  const handleRegenerate = useCallback(() => {
    if (state.status === 'generating') return;
    onRegenerate?.();
  }, [state.status, onRegenerate]);

  const isGenerating = state.status === 'generating';
  const isCompleted = state.status === 'completed';
  const isError = state.status === 'error';

  // Show regenerate UI when completed and has existing minutes
  if (isCompleted && hasExistingMinutes && onRegenerate !== undefined) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Success indicator */}
        <div className="flex items-center gap-2 text-sm text-green-600">
          <svg
            className="w-5 h-5"
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
          <span>Minutes generated</span>
        </div>

        {/* Regenerate button */}
        <button
          type="button"
          onClick={handleRegenerate}
          className="
            flex items-center gap-2 px-4 py-2
            text-sm font-medium text-gray-600
            border border-lark-border rounded-lg
            hover:bg-gray-50 transition-colors
            focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
          "
          aria-label="Regenerate minutes"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Regenerate</span>
        </button>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Error message */}
        <div className="flex items-center gap-2 text-sm text-red-600">
          <svg
            className="w-5 h-5"
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
          <span>{state.error ?? '生成に失敗しました'}</span>
        </div>

        {/* Retry button */}
        <button
          type="button"
          onClick={handleClick}
          className="
            flex items-center gap-2 px-4 py-2
            text-sm font-medium text-white
            bg-lark-primary rounded-lg
            hover:bg-blue-600 transition-colors
            focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
          "
          aria-label="生成を再試行"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>再試行</span>
        </button>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Progress indicator */}
        <div className="flex items-center gap-3">
          <Spinner className="w-5 h-5 text-lark-primary" />
          <span className="text-sm text-gray-600">
            {state.currentStep ?? '議事録を生成中...'}
          </span>
        </div>

        {/* Progress bar */}
        {state.progress !== undefined && (
          <ProgressBar progress={state.progress} />
        )}
      </div>
    );
  }

  // Idle state - show generate button
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        flex items-center gap-2 px-4 py-2
        text-sm font-medium text-white
        bg-lark-primary rounded-lg
        hover:bg-blue-600 transition-colors
        focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
        ${className}
      `}
      aria-label={hasExistingMinutes ? '議事録を再生成' : '議事録を生成'}
    >
      {/* Sparkle icon */}
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        />
      </svg>
      <span>{hasExistingMinutes ? '議事録を再生成' : '議事録を生成'}</span>
    </button>
  );
}

export const GenerateButton = memo(GenerateButtonInner);

/**
 * Props for GenerateMinutesCard component
 */
export interface GenerateMinutesCardProps {
  /** Current generation state */
  readonly state: GenerationState;
  /** Callback when generate button is clicked */
  readonly onGenerate: () => void;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * GenerateMinutesCard component
 *
 * @description Card prompting user to generate AI minutes
 * @example
 * ```tsx
 * <GenerateMinutesCard
 *   state={{ status: 'idle' }}
 *   onGenerate={handleGenerate}
 * />
 * ```
 */
export function GenerateMinutesCard({
  state,
  onGenerate,
  className = '',
}: GenerateMinutesCardProps): JSX.Element {
  return (
    <div
      className={`
        p-8 text-center
        border border-dashed border-lark-border rounded-lg
        bg-gradient-to-b from-white to-gray-50
        ${className}
      `}
    >
      {/* Icon */}
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-lark-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-lark-text mb-2">
        Generate AI Minutes
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        Use AI to automatically generate meeting minutes including topics,
        decisions, and action items from the transcript.
      </p>

      {/* Generate button */}
      <div className="flex justify-center">
        <GenerateButton
          state={state}
          onGenerate={onGenerate}
          hasExistingMinutes={false}
        />
      </div>
    </div>
  );
}
