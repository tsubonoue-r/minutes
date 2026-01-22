/**
 * OAuth authentication unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateOAuthState,
  buildAuthorizationUrl,
} from '../oauth';
import type { LarkConfig } from '@/types/lark';

describe('generateOAuthState', () => {
  it('should generate a 64-character hex string', () => {
    const state = generateOAuthState();

    expect(state).toHaveLength(64);
    expect(state).toMatch(/^[0-9a-f]+$/);
  });

  it('should generate unique states', () => {
    const state1 = generateOAuthState();
    const state2 = generateOAuthState();

    expect(state1).not.toBe(state2);
  });
});

describe('buildAuthorizationUrl', () => {
  const config: LarkConfig = {
    appId: 'test_app_id',
    appSecret: 'test_secret',
    baseUrl: 'https://open.larksuite.com',
    redirectUri: 'http://localhost:3000/api/auth/callback',
  };

  it('should build correct authorization URL', () => {
    const state = 'test_state_123';
    const url = buildAuthorizationUrl(config, state);

    expect(url).toContain('https://open.larksuite.com/open-apis/authen/v1/authorize');
    expect(url).toContain('app_id=test_app_id');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback');
    expect(url).toContain('state=test_state_123');
  });

  it('should include scope when provided', () => {
    const state = 'test_state';
    const scope = 'contact:user.base:readonly';
    const url = buildAuthorizationUrl(config, state, scope);

    expect(url).toContain('scope=contact%3Auser.base%3Areadonly');
  });

  it('should not include scope when not provided', () => {
    const state = 'test_state';
    const url = buildAuthorizationUrl(config, state);

    expect(url).not.toContain('scope=');
  });

  it('should handle Feishu base URL', () => {
    const feishuConfig: LarkConfig = {
      ...config,
      baseUrl: 'https://open.feishu.cn',
    };

    const url = buildAuthorizationUrl(feishuConfig, 'state');

    expect(url).toContain('https://open.feishu.cn/open-apis/authen/v1/authorize');
  });
});
