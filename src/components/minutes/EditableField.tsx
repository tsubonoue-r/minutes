'use client';

/**
 * EditableField - Reusable inline-editable field component
 * @module components/minutes/EditableField
 */

import { memo, useCallback, useRef, useEffect } from 'react';

/**
 * Props for EditableField component
 */
export interface EditableFieldProps {
  /** Current field value */
  readonly value: string;
  /** Callback when value changes */
  readonly onChange: (value: string) => void;
  /** Whether to use a textarea (multiline) or input (single line) */
  readonly multiline?: boolean | undefined;
  /** Placeholder text when empty */
  readonly placeholder?: string | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
  /** Whether the field has been modified from its original value */
  readonly isModified?: boolean | undefined;
  /** Accessible label for the field */
  readonly ariaLabel?: string | undefined;
}

/**
 * EditableField component
 *
 * @description A reusable inline-editable field that renders as an input or textarea.
 *              When a field has been modified, it shows a subtle blue left border to
 *              indicate the change visually.
 *
 * @example
 * ```tsx
 * <EditableField
 *   value={title}
 *   onChange={setTitle}
 *   placeholder="タイトルを入力"
 *   isModified={title !== originalTitle}
 * />
 * ```
 */
function EditableFieldInner({
  value,
  onChange,
  multiline = false,
  placeholder = '',
  className = '',
  isModified = false,
  ariaLabel,
}: EditableFieldProps): JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (multiline && textareaRef.current !== null) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, multiline]);

  const modifiedBorderClass = isModified
    ? 'border-l-2 border-l-lark-primary pl-3'
    : 'pl-3';

  const baseClass = `
    w-full bg-white border border-lark-border rounded-lg
    text-sm text-lark-text
    focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-lark-primary
    transition-all duration-200
    ${modifiedBorderClass}
    ${className}
  `;

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${baseClass} py-2 pr-3 min-h-[60px] resize-none`}
        aria-label={ariaLabel}
        rows={3}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={`${baseClass} py-2 pr-3 h-10`}
      aria-label={ariaLabel}
    />
  );
}

export const EditableField = memo(EditableFieldInner);
