/**
 * Health check API endpoint
 * @module app/api/health/route
 *
 * Provides:
 * - Application status
 * - Lark API connectivity check
 * - Response time measurement
 * - Version information
 */

import { NextResponse } from 'next/server';

/**
 * Health check status
 */
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Individual service check result
 */
interface ServiceCheck {
  readonly status: HealthStatus;
  readonly responseTimeMs: number;
  readonly message?: string;
}

/**
 * Health check response
 */
interface HealthResponse {
  readonly status: HealthStatus;
  readonly timestamp: string;
  readonly version: string;
  readonly uptime: number;
  readonly services: {
    readonly lark: ServiceCheck;
  };
  readonly responseTimeMs: number;
}

/**
 * Application start time for uptime calculation
 */
const APP_START_TIME = Date.now();

/**
 * Check Lark API connectivity
 *
 * @returns Service check result for Lark API
 */
async function checkLarkApi(): Promise<ServiceCheck> {
  const startTime = Date.now();

  const appId = process.env.LARK_APP_ID;
  const appSecret = process.env.LARK_APP_SECRET;

  if (appId === undefined || appSecret === undefined) {
    return {
      status: 'degraded',
      responseTimeMs: Date.now() - startTime,
      message: 'Lark API credentials not configured',
    };
  }

  try {
    // Use the tenant access token endpoint as a lightweight connectivity check
    const response = await fetch(
      'https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: appId,
          app_secret: appSecret,
        }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    const responseTimeMs = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'healthy',
        responseTimeMs,
      };
    }

    return {
      status: 'degraded',
      responseTimeMs,
      message: `Lark API returned status ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTimeMs: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * GET /api/health
 *
 * Returns the health status of the application and its dependencies.
 * Can be used by load balancers, monitoring systems, and deployment pipelines.
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const startTime = Date.now();

  // Check services
  const larkCheck = await checkLarkApi();

  // Determine overall status
  let overallStatus: HealthStatus = 'healthy';
  if (larkCheck.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (larkCheck.status === 'degraded') {
    overallStatus = 'degraded';
  }

  const responseTimeMs = Date.now() - startTime;

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION ?? '0.1.0',
    uptime: Math.floor((Date.now() - APP_START_TIME) / 1000),
    services: {
      lark: larkCheck,
    },
    responseTimeMs,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}
