'use client';

/**
 * Template Import/Export Component
 * @module components/templates/TemplateImportExport
 */

import { memo, useState, useCallback, useRef } from 'react';
import type { Template, TemplateExportData } from '@/types/template';

// ============================================================================
// Types
// ============================================================================

/**
 * Template import/export props
 */
export interface TemplateImportExportProps {
  /** Templates available for export */
  readonly templates: readonly Template[];
  /** Callback when import is complete */
  readonly onImportComplete: (templates: Template[]) => void;
  /** Loading state */
  readonly isLoading?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Import result state
 */
interface ImportResult {
  readonly imported: Template[];
  readonly skipped: string[];
  readonly errors: string[];
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Template Import/Export Component
 *
 * @description Provides UI for importing and exporting templates
 *
 * @example
 * ```tsx
 * <TemplateImportExport
 *   templates={templates}
 *   onImportComplete={handleImportComplete}
 * />
 * ```
 */
function TemplateImportExportInner({
  templates,
  onImportComplete,
  isLoading = false,
  className = '',
}: TemplateImportExportProps): JSX.Element {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter exportable templates (non-default)
  const exportableTemplates = templates.filter(
    (t) => !t.id.startsWith('tpl_default_')
  );

  /**
   * Handle export button click
   */
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch('/api/templates/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateIds: exportableTemplates.map((t) => t.id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error: { message: string } };
        throw new Error(errorData.error.message);
      }

      // Create download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `templates-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  }, [exportableTemplates]);

  /**
   * Handle file selection for import
   */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file === undefined) return;

      setIsImporting(true);
      setError(null);
      setImportResult(null);

      try {
        const text = await file.text();
        const exportData = JSON.parse(text) as TemplateExportData;

        const response = await fetch('/api/templates/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exportData,
            overwriteExisting,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json() as { error: { message: string } };
          throw new Error(errorData.error.message);
        }

        const result = await response.json() as {
          data: {
            imported: Template[];
            skipped: string[];
            errors: string[];
          };
        };

        setImportResult(result.data);
        onImportComplete(result.data.imported);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'インポートに失敗しました');
      } finally {
        setIsImporting(false);
        setShowImportDialog(false);
        // Reset file input
        if (fileInputRef.current !== null) {
          fileInputRef.current.value = '';
        }
      }
    },
    [overwriteExisting, onImportComplete]
  );

  /**
   * Open import dialog
   */
  const handleOpenImportDialog = useCallback(() => {
    setShowImportDialog(true);
    setError(null);
    setImportResult(null);
  }, []);

  /**
   * Close import dialog
   */
  const handleCloseImportDialog = useCallback(() => {
    setShowImportDialog(false);
  }, []);

  /**
   * Trigger file input click
   */
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isDisabled = isLoading || isExporting || isImporting;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Export button */}
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isDisabled || exportableTemplates.length === 0}
          className="
            flex items-center gap-2 px-3 py-2 text-sm font-medium
            text-gray-600 bg-white border border-gray-300 rounded-lg
            hover:bg-gray-50 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isExporting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          )}
          エクスポート ({exportableTemplates.length})
        </button>

        {/* Import button */}
        <button
          type="button"
          onClick={handleOpenImportDialog}
          disabled={isDisabled}
          className="
            flex items-center gap-2 px-3 py-2 text-sm font-medium
            text-gray-600 bg-white border border-gray-300 rounded-lg
            hover:bg-gray-50 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          インポート
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={(e) => void handleFileSelect(e)}
        className="hidden"
      />

      {/* Import dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-lark-text mb-4">
              テンプレートをインポート
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              JSONファイルからテンプレートをインポートします。
            </p>

            {/* Overwrite option */}
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="rounded border-gray-300 text-lark-primary focus:ring-lark-primary"
              />
              <span className="text-sm text-gray-700">
                既存のテンプレートを上書きする
              </span>
            </label>

            {/* Buttons */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCloseImportDialog}
                className="
                  px-4 py-2 text-sm font-medium text-gray-600
                  border border-gray-300 rounded-lg
                  hover:bg-gray-50 transition-colors
                "
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={isImporting}
                className="
                  px-4 py-2 text-sm font-medium text-white
                  bg-lark-primary rounded-lg
                  hover:bg-blue-600 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2
                "
              >
                {isImporting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                    インポート中...
                  </>
                ) : (
                  'ファイルを選択'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error !== null && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Import result */}
      {importResult !== null && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 mb-2">
            インポート完了
          </h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>インポート成功: {importResult.imported.length}件</li>
            {importResult.skipped.length > 0 && (
              <li>スキップ: {importResult.skipped.length}件</li>
            )}
            {importResult.errors.length > 0 && (
              <li className="text-red-600">エラー: {importResult.errors.length}件</li>
            )}
          </ul>
          {importResult.errors.length > 0 && (
            <div className="mt-2 text-xs text-red-600">
              {importResult.errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const TemplateImportExport = memo(TemplateImportExportInner);
export default TemplateImportExport;
