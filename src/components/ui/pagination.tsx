'use client';

import { useCallback } from 'react';

/**
 * ページネーションコンポーネントのprops
 */
export interface PaginationProps {
  /** 現在のページ番号（1から始まる） */
  currentPage: number;
  /** 総ページ数 */
  totalPages: number;
  /** ページ変更時のコールバック */
  onPageChange: (page: number) => void;
  /** 無効化状態 */
  disabled?: boolean;
}

/**
 * ページネーションコンポーネント
 *
 * @description 前へ/次へボタンとページ番号表示を提供
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={1}
 *   totalPages={10}
 *   onPageChange={(page) => console.log(page)}
 * />
 * ```
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps): JSX.Element {
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const handlePrevious = useCallback(() => {
    if (hasPrevious && !disabled) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, hasPrevious, disabled, onPageChange]);

  const handleNext = useCallback(() => {
    if (hasNext && !disabled) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, hasNext, disabled, onPageChange]);

  const handlePageClick = useCallback(
    (page: number) => {
      if (!disabled && page !== currentPage) {
        onPageChange(page);
      }
    },
    [currentPage, disabled, onPageChange]
  );

  // ページ番号の配列を生成（最大5ページ表示）
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisible - 1);
      start = Math.max(1, end - maxVisible + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  if (totalPages <= 1) {
    return <></>;
  }

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      {/* 前へボタン */}
      <button
        type="button"
        onClick={handlePrevious}
        disabled={!hasPrevious || disabled}
        className={`
          flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md
          transition-colors duration-150
          ${
            hasPrevious && !disabled
              ? 'text-lark-text hover:bg-lark-background cursor-pointer'
              : 'text-gray-300 cursor-not-allowed'
          }
        `}
        aria-label="前のページへ"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="ml-1">前へ</span>
      </button>

      {/* ページ番号 */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => handlePageClick(page)}
            disabled={disabled}
            className={`
              min-w-[40px] px-3 py-2 text-sm font-medium rounded-md
              transition-colors duration-150
              ${
                page === currentPage
                  ? 'bg-lark-primary text-white'
                  : disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-lark-text hover:bg-lark-background cursor-pointer'
              }
            `}
            aria-label={`${page}ページ目`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
      </div>

      {/* 次へボタン */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!hasNext || disabled}
        className={`
          flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md
          transition-colors duration-150
          ${
            hasNext && !disabled
              ? 'text-lark-text hover:bg-lark-background cursor-pointer'
              : 'text-gray-300 cursor-not-allowed'
          }
        `}
        aria-label="次のページへ"
      >
        <span className="mr-1">次へ</span>
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
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </nav>
  );
}
