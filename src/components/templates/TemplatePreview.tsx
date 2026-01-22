'use client';

/**
 * Template Preview Component - Display template structure preview
 * @module components/templates/TemplatePreview
 */

import { memo } from 'react';
import type { Template } from '@/types/template';
import { MEETING_TYPE_LABELS, sortSectionsByOrder } from '@/types/template';
import { Badge } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

/**
 * Template preview props
 */
export interface TemplatePreviewProps {
  /** Template to preview */
  readonly template: Template | null;
  /** Show prompt template */
  readonly showPrompt?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

// ============================================================================
// Section Item Component
// ============================================================================

interface SectionItemProps {
  readonly section: {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly required: boolean;
    readonly order: number;
  };
  readonly index: number;
}

function SectionItem({ section, index }: SectionItemProps): JSX.Element {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-lark-primary/10 text-lark-primary text-xs font-medium flex items-center justify-center">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-lark-text">
            {section.title}
          </span>
          {section.required && (
            <span className="text-xs text-red-500">*必須</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg
        className="w-12 h-12 text-gray-300 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
      <p className="text-sm text-gray-500">
        テンプレートを選択してプレビューを表示
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Template Preview Component
 *
 * @description Displays a preview of a template's structure and settings
 *
 * @example
 * ```tsx
 * <TemplatePreview
 *   template={selectedTemplate}
 *   showPrompt={false}
 * />
 * ```
 */
function TemplatePreviewInner({
  template,
  showPrompt = false,
  className = '',
}: TemplatePreviewProps): JSX.Element {
  if (template === null) {
    return (
      <div className={`bg-white rounded-lg border border-lark-border ${className}`}>
        <EmptyState />
      </div>
    );
  }

  const sortedSections = sortSectionsByOrder(template.structure.sections);

  return (
    <div className={`bg-white rounded-lg border border-lark-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-lark-border bg-lark-background">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-lark-text">
            {template.name}
          </h3>
          {template.isDefault && (
            <Badge variant="success">デフォルト</Badge>
          )}
        </div>
        <Badge variant="default">
          {MEETING_TYPE_LABELS[template.meetingType]}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Sections */}
        <div>
          <h4 className="text-sm font-medium text-lark-text mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            セクション構成
          </h4>
          <div className="divide-y divide-gray-100">
            {sortedSections.map((section, index) => (
              <SectionItem key={section.id} section={section} index={index} />
            ))}
          </div>
        </div>

        {/* Focus Areas */}
        <div>
          <h4 className="text-sm font-medium text-lark-text mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            フォーカスエリア
          </h4>
          <div className="flex flex-wrap gap-2">
            {template.structure.focusAreas.map((area) => (
              <Badge key={area} variant="default" className="text-xs">
                {area}
              </Badge>
            ))}
          </div>
        </div>

        {/* Extraction Keywords */}
        <div>
          <h4 className="text-sm font-medium text-lark-text mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            抽出キーワード
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {template.structure.extractionKeywords.map((keyword) => (
              <span
                key={keyword}
                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Prompt Template */}
        {showPrompt && (
          <div>
            <h4 className="text-sm font-medium text-lark-text mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              AIプロンプト
            </h4>
            <pre className="p-3 bg-gray-50 rounded-lg text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
              {template.promptTemplate}
            </pre>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-lark-border bg-gray-50 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>作成: {new Date(template.createdAt).toLocaleDateString('ja-JP')}</span>
          <span>更新: {new Date(template.updatedAt).toLocaleDateString('ja-JP')}</span>
        </div>
      </div>
    </div>
  );
}

export const TemplatePreview = memo(TemplatePreviewInner);
export default TemplatePreview;
