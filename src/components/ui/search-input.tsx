'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * 検索入力コンポーネントのprops
 */
export interface SearchInputProps {
  /** 検索値 */
  value: string;
  /** 値変更時のコールバック（デバウンス後に呼ばれる） */
  onChange: (value: string) => void;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** デバウンス遅延時間（ミリ秒） */
  debounceMs?: number;
  /** 無効化状態 */
  disabled?: boolean;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * 検索入力コンポーネント
 *
 * @description デバウンス処理付きの検索入力フィールド
 * @example
 * ```tsx
 * <SearchInput
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   placeholder="会議を検索..."
 * />
 * ```
 */
export function SearchInput({
  value,
  onChange,
  placeholder = '検索...',
  debounceMs = 300,
  disabled = false,
  className = '',
}: SearchInputProps): JSX.Element {
  const [internalValue, setInternalValue] = useState(value);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 外部からの値変更を反映
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // デバウンス処理
  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  // クリーンアップ
  useEffect(() => {
    return (): void => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);
      debouncedOnChange(newValue);
    },
    [debouncedOnChange]
  );

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [onChange]);

  return (
    <div className={`relative ${className}`}>
      {/* 検索アイコン */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* 入力フィールド */}
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full pl-10 pr-10 py-2 text-sm
          border border-lark-border rounded-lg
          bg-white text-lark-text
          placeholder-gray-400
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
        `}
        aria-label={placeholder}
      />

      {/* クリアボタン */}
      {internalValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="検索をクリア"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
