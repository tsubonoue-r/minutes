/**
 * Minutes Analysis API Route
 * @module app/api/meetings/[id]/minutes/analyze/route
 *
 * POST - 議事録の品質分析実行
 * レスポンス: スコア + 改善提案 + 重複検出結果
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  AIEnhancementService,
  AIEnhancementError,
  createAIEnhancementServiceFromEnv,
} from '@/services/ai-enhancement.service';
import type { Minutes } from '@/types/minutes';
import type { AnalysisResponse } from '@/types/ai-enhancement';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/meetings/[id]/minutes/analyze
 *
 * 議事録の品質分析を実行
 *
 * Request Body:
 * - minutes: Minutes - 分析対象の議事録データ
 *
 * Response:
 * - qualityScore: QualityScore - 品質スコア
 * - improvements: Improvement[] - 改善提案
 * - duplicateDetection: DuplicateDetectionResult - 重複検出結果
 * - tokenUsage: TokenUsage - トークン使用量
 * - processingTimeMs: number - 処理時間（ミリ秒）
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { id: meetingId } = await params;
    const body: unknown = await request.json();

    // リクエストボディの検証
    if (body === null || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body is required', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const { minutes } = body as { minutes?: Minutes };

    if (minutes === undefined) {
      return NextResponse.json(
        { error: 'Minutes data is required', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // meetingIdの一致確認
    if (minutes.meetingId !== meetingId) {
      return NextResponse.json(
        {
          error: 'Meeting ID mismatch between URL and minutes data',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // サービスの作成
    let service: AIEnhancementService;
    try {
      service = createAIEnhancementServiceFromEnv();
    } catch (error) {
      if (error instanceof AIEnhancementError && error.code === 'API_ERROR') {
        return NextResponse.json(
          { error: 'AI service is not configured', code: 'SERVICE_UNAVAILABLE' },
          { status: 503 }
        );
      }
      throw error;
    }

    // 並列で分析を実行
    const [qualityScore, improvements, duplicateGroups] = await Promise.all([
      service.scoreMinutesQuality(minutes),
      service.suggestImprovements(minutes),
      service.detectDuplicateActionItems(minutes.actionItems),
    ]);

    const processingTimeMs = Date.now() - startTime;
    const tokenUsage = service.getTokenUsage();

    const response: AnalysisResponse = {
      qualityScore,
      improvements,
      duplicateDetection: {
        groups: duplicateGroups,
        totalItemsProcessed: minutes.actionItems.length,
        duplicateItemsFound: duplicateGroups.reduce(
          (acc, group) => acc + group.items.length,
          0
        ),
      },
      tokenUsage,
      processingTimeMs,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;

    if (error instanceof AIEnhancementError) {
      const statusCode = getStatusCodeForError(error.code);
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          processingTimeMs,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        processingTimeMs,
      },
      { status: 500 }
    );
  }
}

/**
 * エラーコードからHTTPステータスコードを取得
 */
function getStatusCodeForError(code: string): number {
  switch (code) {
    case 'API_ERROR':
      return 502;
    case 'PARSE_ERROR':
      return 502;
    case 'VALIDATION_ERROR':
      return 400;
    case 'INSUFFICIENT_DATA':
      return 422;
    default:
      return 500;
  }
}
