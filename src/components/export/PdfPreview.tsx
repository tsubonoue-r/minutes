'use client';

/**
 * PdfPreview - Preview component for PDF export of meeting minutes
 * @module components/export/PdfPreview
 */

import { memo, useMemo } from 'react';
import type { Minutes } from '@/types/minutes';
import { minutesToPdfHtml } from '@/services/pdf-export.service';

/**
 * Props for the PdfPreview component
 */
export interface PdfPreviewProps {
  /** Minutes data to preview */
  readonly minutes: Minutes;
  /** Additional CSS class name */
  readonly className?: string | undefined;
}

/**
 * PdfPreview component
 *
 * Renders an iframe-based preview of what the PDF export will look like.
 * Uses the same HTML generation logic as the actual PDF export service
 * to ensure WYSIWYG fidelity.
 *
 * @description Displays a scaled-down preview of the PDF output in an iframe
 *
 * @example
 * ```tsx
 * <PdfPreview
 *   minutes={minutesData}
 *   className="h-96"
 * />
 * ```
 */
function PdfPreviewInner({
  minutes,
  className = '',
}: PdfPreviewProps): JSX.Element {
  const htmlContent = useMemo(() => {
    try {
      return minutesToPdfHtml(minutes);
    } catch {
      return null;
    }
  }, [minutes]);

  const srcDoc = useMemo(() => {
    if (htmlContent === null) {
      return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#646A73;">
  <p>プレビューを生成できませんでした</p>
</body>
</html>`;
    }
    return htmlContent;
  }, [htmlContent]);

  return (
    <div
      className={`relative border border-lark-border rounded-lg overflow-hidden bg-white ${className}`}
    >
      {/* Preview label */}
      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500 pointer-events-none">
        PDFプレビュー
      </div>

      {/* Preview iframe */}
      <iframe
        srcDoc={srcDoc}
        title="PDFプレビュー"
        className="w-full h-full border-0"
        sandbox="allow-same-origin"
        aria-label="議事録PDFプレビュー"
      />
    </div>
  );
}

export const PdfPreview = memo(PdfPreviewInner);
