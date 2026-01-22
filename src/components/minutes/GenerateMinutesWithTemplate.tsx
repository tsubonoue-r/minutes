'use client';

/**
 * Generate Minutes with Template Component
 * @module components/minutes/GenerateMinutesWithTemplate
 */

import { memo, useState, useCallback } from 'react';
import type { Template } from '@/types/template';
import { TemplateSelector } from '@/components/templates';
import {
  GenerateButton,
  type GenerationState,
} from './GenerateButton';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for GenerateMinutesWithTemplate component
 */
export interface GenerateMinutesWithTemplateProps {
  /** Meeting title for auto-selection */
  readonly meetingTitle: string;
  /** Current generation state */
  readonly state: GenerationState;
  /** Callback when generate is clicked with selected template */
  readonly onGenerate: (template: Template | null) => void;
  /** Whether to show template selector */
  readonly showTemplateSelector?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * GenerateMinutesWithTemplate component
 *
 * @description Card prompting user to generate AI minutes with template selection
 *
 * @example
 * ```tsx
 * <GenerateMinutesWithTemplate
 *   meetingTitle="Weekly Team Standup"
 *   state={{ status: 'idle' }}
 *   onGenerate={handleGenerate}
 * />
 * ```
 */
function GenerateMinutesWithTemplateInner({
  meetingTitle,
  state,
  onGenerate,
  showTemplateSelector = true,
  className = '',
}: GenerateMinutesWithTemplateProps): JSX.Element {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  const handleSelectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
  }, []);

  const handleGenerate = useCallback(() => {
    onGenerate(selectedTemplate);
  }, [onGenerate, selectedTemplate]);

  const toggleSelector = useCallback(() => {
    setShowSelector((prev) => !prev);
  }, []);

  const isGenerating = state.status === 'generating';

  return (
    <div
      className={`
        p-6 text-center
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
        AI議事録を生成
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
        AIが会議の文字起こしから議事録を自動生成します。
        トピック、決定事項、アクションアイテムが抽出されます。
      </p>

      {/* Selected template indicator */}
      {selectedTemplate !== null && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm font-medium text-blue-800">
                {selectedTemplate.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTemplate(null)}
              className="text-blue-500 hover:text-blue-700"
              aria-label="テンプレートをクリア"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Template selector toggle */}
      {showTemplateSelector && !isGenerating && (
        <div className="mb-4">
          <button
            type="button"
            onClick={toggleSelector}
            className="text-sm text-lark-primary hover:text-blue-600 underline"
          >
            {showSelector ? 'テンプレート選択を閉じる' : 'テンプレートを選択'}
          </button>
        </div>
      )}

      {/* Template selector */}
      {showTemplateSelector && showSelector && !isGenerating && (
        <div className="mb-6 max-w-md mx-auto">
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            meetingTitle={meetingTitle}
            onSelect={handleSelectTemplate}
          />
        </div>
      )}

      {/* Generate button */}
      <div className="flex justify-center">
        <GenerateButton
          state={state}
          onGenerate={handleGenerate}
          hasExistingMinutes={false}
        />
      </div>
    </div>
  );
}

export const GenerateMinutesWithTemplate = memo(GenerateMinutesWithTemplateInner);
export default GenerateMinutesWithTemplate;
