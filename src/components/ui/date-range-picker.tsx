'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 日付範囲の型定義
 */
export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * 日付範囲選択コンポーネントのprops
 */
export interface DateRangePickerProps {
  /** 開始日 */
  startDate: Date | null;
  /** 終了日 */
  endDate: Date | null;
  /** 日付変更時のコールバック */
  onDateChange: (range: DateRange) => void;
  /** 無効化状態 */
  disabled?: boolean;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * 日付をフォーマット
 */
function formatDate(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * 月の日数を取得
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * 月の最初の曜日を取得（0=日曜日）
 */
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * 日付範囲選択コンポーネント
 *
 * @description カレンダーUIで日付範囲を選択
 * @example
 * ```tsx
 * <DateRangePicker
 *   startDate={startDate}
 *   endDate={endDate}
 *   onDateChange={({ startDate, endDate }) => {
 *     setStartDate(startDate);
 *     setEndDate(endDate);
 *   }}
 * />
 * ```
 */
export function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  disabled = false,
  className = '',
}: DateRangePickerProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => startDate ?? new Date());
  const [selectingStart, setSelectingStart] = useState(true);
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

  const handlePrevMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleDateSelect = useCallback(
    (day: number) => {
      const selectedDate = new Date(
        viewDate.getFullYear(),
        viewDate.getMonth(),
        day
      );

      if (selectingStart) {
        onDateChange({
          startDate: selectedDate,
          endDate: null,
        });
        setSelectingStart(false);
      } else {
        if (startDate && selectedDate < startDate) {
          onDateChange({
            startDate: selectedDate,
            endDate: startDate,
          });
        } else {
          onDateChange({
            startDate,
            endDate: selectedDate,
          });
        }
        setSelectingStart(true);
        setIsOpen(false);
      }
    },
    [viewDate, selectingStart, startDate, onDateChange]
  );

  const handleClear = useCallback(() => {
    onDateChange({ startDate: null, endDate: null });
    setSelectingStart(true);
  }, [onDateChange]);

  const isDateInRange = useCallback(
    (day: number): boolean => {
      if (!startDate || !endDate) return false;
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      return date >= startDate && date <= endDate;
    },
    [startDate, endDate, viewDate]
  );

  const isDateSelected = useCallback(
    (day: number): boolean => {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      return (
        (startDate !== null && date.getTime() === startDate.getTime()) ||
        (endDate !== null && date.getTime() === endDate.getTime())
      );
    },
    [startDate, endDate, viewDate]
  );

  // カレンダーの日付を生成
  const getCalendarDays = (): (number | null)[] => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (number | null)[] = [];

    // 空白セル
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // 日付セル
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const monthNames = [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ];

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  const displayValue =
    startDate || endDate
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : '日付を選択';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* トリガーボタン */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          flex items-center justify-between w-full px-3 py-2 text-sm
          border border-lark-border rounded-lg
          bg-white text-lark-text
          transition-colors duration-150
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-lark-primary cursor-pointer'}
          ${isOpen ? 'ring-2 ring-lark-primary border-transparent' : ''}
        `}
      >
        <span className={startDate || endDate ? '' : 'text-gray-400'}>
          {displayValue}
        </span>
        <svg
          className="w-5 h-5 text-gray-400 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {/* カレンダードロップダウン */}
      {isOpen && (
        <div className="absolute z-50 mt-1 p-4 bg-white border border-lark-border rounded-lg shadow-lg">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-lark-background rounded transition-colors"
              aria-label="前月"
            >
              <svg
                className="w-5 h-5 text-lark-text"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span className="text-sm font-medium text-lark-text">
              {viewDate.getFullYear()}年 {monthNames[viewDate.getMonth()]}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-lark-background rounded transition-colors"
              aria-label="次月"
            >
              <svg
                className="w-5 h-5 text-lark-text"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-1">
            {getCalendarDays().map((day, index) => (
              <div key={index} className="aspect-square">
                {day !== null ? (
                  <button
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={`
                      w-full h-full flex items-center justify-center text-sm rounded
                      transition-colors duration-150
                      ${
                        isDateSelected(day)
                          ? 'bg-lark-primary text-white'
                          : isDateInRange(day)
                            ? 'bg-lark-primary/20 text-lark-text'
                            : 'text-lark-text hover:bg-lark-background'
                      }
                    `}
                  >
                    {day}
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* フッター */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-lark-border">
            <span className="text-xs text-gray-500">
              {selectingStart ? '開始日を選択' : '終了日を選択'}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-lark-primary hover:underline"
            >
              クリア
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
