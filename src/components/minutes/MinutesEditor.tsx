'use client';

/**
 * MinutesEditor - Inline editing component for meeting minutes
 * @module components/minutes/MinutesEditor
 */

import { memo, useState, useCallback } from 'react';
import type {
  Minutes,
  TopicSegment,
  DecisionItem,
  ActionItem,
  Priority,
  ActionItemStatus,
} from '@/types/minutes';
import { EditableField } from './EditableField';
import { useMinutesEditor } from '@/hooks/use-minutes-editor';

/**
 * Props for MinutesEditor component
 */
export interface MinutesEditorProps {
  /** Minutes data to edit */
  readonly minutes: Minutes;
  /** Callback when the user saves changes */
  readonly onSave: (updated: Minutes) => void | Promise<void>;
  /** Callback when the user cancels editing */
  readonly onCancel: () => void;
  /** Whether a save operation is in progress */
  readonly isSaving?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Priority options for dropdown
 */
const PRIORITY_OPTIONS: readonly { readonly value: Priority; readonly label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

/**
 * Status options for dropdown
 */
const STATUS_OPTIONS: readonly { readonly value: ActionItemStatus; readonly label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

/**
 * Section header component
 */
function SectionHeader({
  title,
  count,
}: {
  readonly title: string;
  readonly count: number;
}): JSX.Element {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-sm font-semibold text-lark-text uppercase tracking-wider">
        {title}
      </h3>
      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
        {count}
      </span>
    </div>
  );
}

/**
 * Editable topic card component
 */
function EditableTopicCard({
  topic,
  topicIndex,
  onUpdateTopic,
  onUpdateKeyPoint,
  onAddKeyPoint,
  onRemoveKeyPoint,
  isFieldModified,
}: {
  readonly topic: TopicSegment;
  readonly topicIndex: number;
  readonly onUpdateTopic: (topicId: string, field: keyof TopicSegment, value: string) => void;
  readonly onUpdateKeyPoint: (topicId: string, index: number, value: string) => void;
  readonly onAddKeyPoint: (topicId: string) => void;
  readonly onRemoveKeyPoint: (topicId: string, index: number) => void;
  readonly isFieldModified: (path: string) => boolean;
}): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <article
      className="border border-lark-border rounded-lg bg-white"
      aria-labelledby={`edit-topic-title-${topic.id}`}
    >
      {/* Topic header */}
      <header
        className={`
          flex items-center justify-between gap-4 p-4 cursor-pointer select-none
          ${isExpanded ? 'border-b border-gray-100' : ''}
        `}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span
            id={`edit-topic-title-${topic.id}`}
            className="text-sm font-medium text-lark-text truncate"
          >
            {topic.title || `Topic ${topicIndex + 1}`}
          </span>
        </div>
      </header>

      {/* Topic content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Title
            </label>
            <EditableField
              value={topic.title}
              onChange={(value) => onUpdateTopic(topic.id, 'title', value)}
              placeholder="Topic title"
              isModified={isFieldModified(`topics.${topicIndex}.title`)}
              ariaLabel={`Topic ${topicIndex + 1} title`}
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Summary
            </label>
            <EditableField
              value={topic.summary}
              onChange={(value) => onUpdateTopic(topic.id, 'summary', value)}
              multiline
              placeholder="Topic summary"
              isModified={isFieldModified(`topics.${topicIndex}.summary`)}
              ariaLabel={`Topic ${topicIndex + 1} summary`}
            />
          </div>

          {/* Key Points */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">
                Key Points
              </label>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddKeyPoint(topic.id);
                }}
                className="
                  flex items-center gap-1 text-xs text-lark-primary
                  hover:text-blue-700 transition-colors
                  focus:outline-none focus:underline
                "
                aria-label="Add key point"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>追加</span>
              </button>
            </div>
            <div className="space-y-2">
              {topic.keyPoints.map((point, pointIndex) => (
                <div key={pointIndex} className="flex items-start gap-2">
                  <span
                    className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-lark-primary mt-4"
                    aria-hidden="true"
                  />
                  <EditableField
                    value={point}
                    onChange={(value) => onUpdateKeyPoint(topic.id, pointIndex, value)}
                    placeholder="Key point"
                    isModified={isFieldModified(`topics.${topicIndex}.keyPoints.${pointIndex}`)}
                    ariaLabel={`Topic ${topicIndex + 1} key point ${pointIndex + 1}`}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveKeyPoint(topic.id, pointIndex);
                    }}
                    className="
                      flex-shrink-0 p-2 text-gray-400
                      hover:text-red-500 transition-colors
                      focus:outline-none focus:text-red-500
                    "
                    aria-label={`Remove key point ${pointIndex + 1}`}
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
              {topic.keyPoints.length === 0 && (
                <p className="text-xs text-gray-400 italic">
                  No key points yet. Click &ldquo;追加&rdquo; to add one.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/**
 * Editable decision card component
 */
function EditableDecisionCard({
  decision,
  decisionIndex,
  onUpdateDecision,
  isFieldModified,
}: {
  readonly decision: DecisionItem;
  readonly decisionIndex: number;
  readonly onUpdateDecision: (decisionId: string, field: keyof DecisionItem, value: string) => void;
  readonly isFieldModified: (path: string) => boolean;
}): JSX.Element {
  return (
    <article
      className="border-l-4 border-lark-primary bg-blue-50 rounded-r-lg p-4 space-y-3"
      aria-labelledby={`edit-decision-${decision.id}`}
    >
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Content
        </label>
        <EditableField
          value={decision.content}
          onChange={(value) => onUpdateDecision(decision.id, 'content', value)}
          placeholder="Decision content"
          isModified={isFieldModified(`decisions.${decisionIndex}.content`)}
          ariaLabel={`Decision ${decisionIndex + 1} content`}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Context
        </label>
        <EditableField
          value={decision.context}
          onChange={(value) => onUpdateDecision(decision.id, 'context', value)}
          multiline
          placeholder="Background or reasoning"
          isModified={isFieldModified(`decisions.${decisionIndex}.context`)}
          ariaLabel={`Decision ${decisionIndex + 1} context`}
        />
      </div>
    </article>
  );
}

/**
 * Editable action item row component
 */
function EditableActionItemRow({
  item,
  itemIndex,
  onUpdateActionItem,
  isFieldModified,
}: {
  readonly item: ActionItem;
  readonly itemIndex: number;
  readonly onUpdateActionItem: (
    actionItemId: string,
    field: keyof ActionItem,
    value: string | Priority | ActionItemStatus
  ) => void;
  readonly isFieldModified: (path: string) => boolean;
}): JSX.Element {
  const contentModified = isFieldModified(`actionItems.${itemIndex}.content`);
  const assigneeModified = isFieldModified(`actionItems.${itemIndex}.assignee`);
  const priorityModified = isFieldModified(`actionItems.${itemIndex}.priority`);
  const statusModified = isFieldModified(`actionItems.${itemIndex}.status`);
  const dueDateModified = isFieldModified(`actionItems.${itemIndex}.dueDate`);

  return (
    <article
      className="p-4 border border-lark-border rounded-lg bg-white space-y-3"
      aria-labelledby={`edit-action-item-${item.id}`}
    >
      {/* Content */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Task
        </label>
        <EditableField
          value={item.content}
          onChange={(value) => onUpdateActionItem(item.id, 'content', value)}
          placeholder="Action item content"
          isModified={contentModified}
          ariaLabel={`Action item ${itemIndex + 1} content`}
        />
      </div>

      {/* Row: Assignee, Priority, Status, Due Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Assignee */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Assignee
          </label>
          <div className={assigneeModified ? 'border-l-2 border-l-lark-primary pl-1' : ''}>
            <input
              type="text"
              value={item.assignee?.name ?? ''}
              onChange={(e) => onUpdateActionItem(item.id, 'assignee', e.target.value)}
              placeholder="Assignee name"
              className="
                w-full bg-white border border-lark-border rounded-lg
                text-sm text-lark-text py-2 px-3 h-10
                focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-lark-primary
                transition-all duration-200
              "
              aria-label={`Action item ${itemIndex + 1} assignee`}
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Priority
          </label>
          <div className={priorityModified ? 'border-l-2 border-l-lark-primary pl-1' : ''}>
            <select
              value={item.priority}
              onChange={(e) =>
                onUpdateActionItem(item.id, 'priority', e.target.value as Priority)
              }
              className="
                w-full bg-white border border-lark-border rounded-lg
                text-sm text-lark-text py-2 px-3 h-10
                focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-lark-primary
                transition-all duration-200
              "
              aria-label={`Action item ${itemIndex + 1} priority`}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Status
          </label>
          <div className={statusModified ? 'border-l-2 border-l-lark-primary pl-1' : ''}>
            <select
              value={item.status}
              onChange={(e) =>
                onUpdateActionItem(item.id, 'status', e.target.value as ActionItemStatus)
              }
              className="
                w-full bg-white border border-lark-border rounded-lg
                text-sm text-lark-text py-2 px-3 h-10
                focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-lark-primary
                transition-all duration-200
              "
              aria-label={`Action item ${itemIndex + 1} status`}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Due Date
          </label>
          <div className={dueDateModified ? 'border-l-2 border-l-lark-primary pl-1' : ''}>
            <input
              type="date"
              value={item.dueDate ?? ''}
              onChange={(e) => onUpdateActionItem(item.id, 'dueDate', e.target.value)}
              className="
                w-full bg-white border border-lark-border rounded-lg
                text-sm text-lark-text py-2 px-3 h-10
                focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-lark-primary
                transition-all duration-200
              "
              aria-label={`Action item ${itemIndex + 1} due date`}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * MinutesEditor component
 *
 * @description Provides inline editing for meeting minutes content.
 *              Supports editing title, summary, topics (with key points),
 *              decisions, and action items. Changed fields are highlighted
 *              with a blue left border for visual diff.
 *
 * @example
 * ```tsx
 * <MinutesEditor
 *   minutes={minutesData}
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 *   isSaving={isSaving}
 * />
 * ```
 */
function MinutesEditorInner({
  minutes,
  onSave,
  onCancel,
  isSaving = false,
  className = '',
}: MinutesEditorProps): JSX.Element {
  const {
    draft,
    isDirty,
    updateField,
    updateTopic,
    updateKeyPoint,
    addKeyPoint,
    removeKeyPoint,
    updateDecision,
    updateActionItem,
    saveDraft,
    isFieldModified,
  } = useMinutesEditor(minutes);

  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * Handle save action
   */
  const handleSave = useCallback(async () => {
    setSaveError(null);
    try {
      const updated = saveDraft();
      await onSave(updated);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An error occurred while saving';
      setSaveError(message);
    }
  }, [saveDraft, onSave]);

  /**
   * Handle cancel action
   */
  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <div
      className={`bg-white rounded-lg border border-lark-border ${className}`}
      role="region"
      aria-label="議事録編集"
    >
      {/* Header */}
      <header className="p-4 border-b border-lark-border">
        <div className="flex items-center gap-2 mb-4">
          <svg
            className="w-5 h-5 text-lark-primary flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-lark-text">
            議事録を編集
          </h2>
          {isDirty && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
              変更あり
            </span>
          )}
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Title
          </label>
          <EditableField
            value={draft.title}
            onChange={(value) => updateField('title', value)}
            placeholder="Meeting title"
            isModified={isFieldModified('title')}
            ariaLabel="Meeting title"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Summary
          </label>
          <EditableField
            value={draft.summary}
            onChange={(value) => updateField('summary', value)}
            multiline
            placeholder="Overall meeting summary"
            isModified={isFieldModified('summary')}
            ariaLabel="Meeting summary"
          />
        </div>
      </header>

      {/* Topics Section */}
      <section className="p-4 border-b border-lark-border">
        <SectionHeader title="Topics" count={draft.topics.length} />
        <div className="space-y-4">
          {draft.topics.map((topic, index) => (
            <EditableTopicCard
              key={topic.id}
              topic={topic}
              topicIndex={index}
              onUpdateTopic={updateTopic}
              onUpdateKeyPoint={updateKeyPoint}
              onAddKeyPoint={addKeyPoint}
              onRemoveKeyPoint={removeKeyPoint}
              isFieldModified={isFieldModified}
            />
          ))}
          {draft.topics.length === 0 && (
            <div className="p-8 text-center text-gray-500 border border-dashed border-lark-border rounded-lg">
              <p className="text-sm">No topics</p>
            </div>
          )}
        </div>
      </section>

      {/* Decisions Section */}
      <section className="p-4 border-b border-lark-border">
        <SectionHeader title="Decisions" count={draft.decisions.length} />
        <div className="space-y-3">
          {draft.decisions.map((decision, index) => (
            <EditableDecisionCard
              key={decision.id}
              decision={decision}
              decisionIndex={index}
              onUpdateDecision={updateDecision}
              isFieldModified={isFieldModified}
            />
          ))}
          {draft.decisions.length === 0 && (
            <div className="p-8 text-center text-gray-500 border border-dashed border-lark-border rounded-lg">
              <p className="text-sm">No decisions</p>
            </div>
          )}
        </div>
      </section>

      {/* Action Items Section */}
      <section className="p-4">
        <SectionHeader title="Action Items" count={draft.actionItems.length} />
        <div className="space-y-3">
          {draft.actionItems.map((item, index) => (
            <EditableActionItemRow
              key={item.id}
              item={item}
              itemIndex={index}
              onUpdateActionItem={updateActionItem}
              isFieldModified={isFieldModified}
            />
          ))}
          {draft.actionItems.length === 0 && (
            <div className="p-8 text-center text-gray-500 border border-dashed border-lark-border rounded-lg">
              <p className="text-sm">No action items</p>
            </div>
          )}
        </div>
      </section>

      {/* Save error message */}
      {saveError !== null && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{saveError}</p>
        </div>
      )}

      {/* Sticky save/cancel toolbar */}
      <footer className="sticky bottom-0 p-4 border-t border-lark-border bg-white rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {isDirty
              ? '変更が保存されていません'
              : '変更はありません'}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="
                px-4 py-2 text-sm font-medium text-gray-700
                border border-lark-border rounded-lg
                hover:bg-gray-50 transition-colors
                focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSave();
              }}
              disabled={isSaving || !isDirty}
              className="
                px-4 py-2 text-sm font-medium text-white
                bg-lark-primary rounded-lg
                hover:bg-blue-600 transition-colors
                focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2
              "
            >
              {isSaving ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>保存中...</span>
                </>
              ) : (
                <span>保存</span>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const MinutesEditor = memo(MinutesEditorInner);
