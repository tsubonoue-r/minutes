'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * ソートオプションの型定義
 */
export interface SortOption<T extends string = string> {
  /** オプションの値 */
  value: T;
  /** 表示ラベル */
  label: string;
}

/**
 * ソート選択コンポーネントのprops
 */
export interface SortSelectProps<T extends string = string> {
  /** 現在の値 */
  value: T;
  /** 選択肢 */
  options: readonly SortOption<T>[];
  /** 値変更時のコールバック */
  onChange: (value: T) => void;
  /** 無効化状態 */
  disabled?: boolean;
  /** カスタムクラス名 */
  className?: string;
  /** ラベル */
  label?: string;
}

/**
 * ソート選択コンポーネント
 *
 * @description ドロップダウンUIでソート順を選択
 * @example
 * ```tsx
 * const options = [
 *   { value: 'newest', label: '新しい順' },
 *   { value: 'oldest', label: '古い順' },
 * ] as const;
 *
 * <SortSelect
 *   value="newest"
 *   options={options}
 *   onChange={(value) => console.log(value)}
 * />
 * ```
 */
export function SortSelect<T extends string = string>({
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  label,
}: SortSelectProps<T>): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        containerRef.current !== null &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleSelect = useCallback(
    (optionValue: T) => {
      onChange(optionValue);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      } else if (event.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [handleToggle]
  );

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label ?? '選択してください';

  const hasLabel = typeof label === 'string' && label.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {hasLabel && (
        <label className="block text-sm font-medium text-lark-text mb-1">
          {label}
        </label>
      )}

      {/* トリガーボタン */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          flex items-center justify-between w-full px-3 py-2 text-sm
          border border-lark-border rounded-lg
          bg-white text-lark-text
          transition-colors duration-150
          ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'hover:border-lark-primary cursor-pointer'}
          ${isOpen ? 'ring-2 ring-lark-primary border-transparent' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{displayLabel}</span>
        <svg
          className={`w-5 h-5 text-gray-400 ml-2 transition-transform duration-150 ${
            isOpen ? 'transform rotate-180' : ''
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
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <ul
          className="absolute z-50 mt-1 w-full bg-white border border-lark-border rounded-lg shadow-lg py-1 max-h-60 overflow-auto"
          role="listbox"
          aria-activedescendant={`option-${value}`}
        >
          {options.map((option) => (
            <li
              key={option.value}
              id={`option-${option.value}`}
              role="option"
              aria-selected={option.value === value}
              className={`
                px-3 py-2 text-sm cursor-pointer
                transition-colors duration-150
                ${
                  option.value === value
                    ? 'bg-lark-primary/10 text-lark-primary font-medium'
                    : 'text-lark-text hover:bg-lark-background'
                }
              `}
              onClick={() => handleSelect(option.value)}
            >
              <div className="flex items-center justify-between">
                <span>{option.label}</span>
                {option.value === value && (
                  <svg
                    className="w-4 h-4 text-lark-primary"
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
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
