/**
 * Tests for input sanitization utilities
 * @module lib/__tests__/sanitize.test
 */

import { describe, it, expect } from 'vitest';
import {
  sanitize,
  stripHtmlTags,
  hasSqlInjection,
  escapeSqlChars,
  hasPathTraversal,
  sanitizePath,
  hasDangerousHtml,
  encodeHtmlEntities,
  sanitizeObject,
  sanitizeLarkApiParam,
} from '../sanitize';

describe('stripHtmlTags', () => {
  it('should strip all HTML tags', () => {
    expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello');
    expect(stripHtmlTags('<b>bold</b> text')).toBe('bold text');
    expect(stripHtmlTags('<div class="x">content</div>')).toBe('content');
  });

  it('should handle self-closing tags', () => {
    expect(stripHtmlTags('text<br/>more')).toBe('textmore');
    expect(stripHtmlTags('text<hr />more')).toBe('textmore');
  });

  it('should handle nested tags', () => {
    expect(stripHtmlTags('<div><p><span>deep</span></p></div>')).toBe('deep');
  });

  it('should preserve text without tags', () => {
    expect(stripHtmlTags('no tags here')).toBe('no tags here');
  });

  it('should handle empty string', () => {
    expect(stripHtmlTags('')).toBe('');
  });

  it('should preserve allowed tags', () => {
    const result = stripHtmlTags('<b>bold</b> <script>evil()</script>', ['b']);
    expect(result).toBe('<b>bold</b> evil()');
  });

  it('should be case-insensitive for allowed tags', () => {
    const result = stripHtmlTags('<B>bold</B> <DIV>div</DIV>', ['b']);
    expect(result).toBe('<B>bold</B> div');
  });
});

describe('hasSqlInjection', () => {
  it('should detect SELECT injection', () => {
    expect(hasSqlInjection("' OR SELECT * FROM users--")).toBe(true);
    expect(hasSqlInjection('1; SELECT password FROM users')).toBe(true);
  });

  it('should detect DROP injection', () => {
    expect(hasSqlInjection('DROP TABLE users')).toBe(true);
    expect(hasSqlInjection('; DROP TABLE users;--')).toBe(true);
  });

  it('should detect UNION injection', () => {
    expect(hasSqlInjection("' UNION SELECT username, password FROM users--")).toBe(true);
    expect(hasSqlInjection("1 UNION ALL SELECT * FROM passwords")).toBe(true);
  });

  it('should detect OR 1=1 patterns', () => {
    expect(hasSqlInjection("' OR 1=1--")).toBe(true);
    expect(hasSqlInjection("' AND 1=1--")).toBe(true);
  });

  it('should detect comment-based injection', () => {
    expect(hasSqlInjection("admin'-- ")).toBe(true);
    expect(hasSqlInjection("admin'--")).toBe(true); // -- at end of string
    expect(hasSqlInjection('value/* comment */')).toBe(true);
  });

  it('should detect function-based injection', () => {
    expect(hasSqlInjection('SLEEP(5)')).toBe(true);
    expect(hasSqlInjection('BENCHMARK(1000000,MD5(1))')).toBe(true);
  });

  it('should not flag normal text', () => {
    expect(hasSqlInjection('Hello world')).toBe(false);
    expect(hasSqlInjection('Meeting at 3pm')).toBe(false);
    expect(hasSqlInjection('Project update #42')).toBe(false);
  });

  it('should not flag normal text with SQL keywords in context', () => {
    // "selected" contains "select" but is not SQL
    expect(hasSqlInjection('I selected the option')).toBe(false);
    expect(hasSqlInjection('dropdown selection')).toBe(false);
  });
});

describe('escapeSqlChars', () => {
  it('should escape single quotes', () => {
    expect(escapeSqlChars("it's")).toBe("it''s");
  });

  it('should escape backslashes', () => {
    expect(escapeSqlChars('path\\file')).toBe('path\\\\file');
  });

  it('should escape semicolons', () => {
    expect(escapeSqlChars('cmd; evil')).toBe('cmd\\; evil');
  });

  it('should escape comment sequences', () => {
    expect(escapeSqlChars('value--comment')).toBe('value\\-\\-comment');
  });
});

describe('hasPathTraversal', () => {
  it('should detect ../ sequences', () => {
    expect(hasPathTraversal('../etc/passwd')).toBe(true);
    expect(hasPathTraversal('../../secret')).toBe(true);
    expect(hasPathTraversal('path/../../../etc/passwd')).toBe(true);
  });

  it('should detect ..\\ sequences', () => {
    expect(hasPathTraversal('..\\windows\\system32')).toBe(true);
  });

  it('should detect URL-encoded traversal', () => {
    expect(hasPathTraversal('%2e%2e%2f')).toBe(true);
    expect(hasPathTraversal('%2e%2e/')).toBe(true);
    expect(hasPathTraversal('..%2f')).toBe(true);
    expect(hasPathTraversal('%2e%2e%5c')).toBe(true);
  });

  it('should detect double-encoded traversal', () => {
    expect(hasPathTraversal('%252e%252e%252f')).toBe(true);
  });

  it('should not flag normal paths', () => {
    expect(hasPathTraversal('/home/user/file.txt')).toBe(false);
    expect(hasPathTraversal('documents/report.pdf')).toBe(false);
    expect(hasPathTraversal('./local-file.txt')).toBe(false);
  });
});

describe('sanitizePath', () => {
  it('should remove ../ sequences', () => {
    expect(sanitizePath('../etc/passwd')).toBe('etc/passwd');
    expect(sanitizePath('a/../../b')).toBe('a/b');
  });

  it('should remove null bytes', () => {
    expect(sanitizePath('file\0.txt')).toBe('file.txt');
  });

  it('should normalize path separators', () => {
    expect(sanitizePath('path\\to\\file')).toBe('path/to/file');
  });

  it('should remove leading slashes', () => {
    expect(sanitizePath('/etc/passwd')).toBe('etc/passwd');
    expect(sanitizePath('///root')).toBe('root');
  });

  it('should handle URL-encoded sequences', () => {
    const result = sanitizePath('%2e%2e%2fetc/passwd');
    expect(result).not.toContain('..');
  });
});

describe('hasDangerousHtml', () => {
  it('should detect script tags', () => {
    expect(hasDangerousHtml('<script>alert("xss")</script>')).toBe(true);
    expect(hasDangerousHtml('<script src="evil.js"></script>')).toBe(true);
  });

  it('should detect event handlers', () => {
    expect(hasDangerousHtml('<img onerror="alert(1)">')).toBe(true);
    expect(hasDangerousHtml('<div onmouseover="steal()">')).toBe(true);
  });

  it('should detect javascript: protocol', () => {
    expect(hasDangerousHtml('<a href="javascript:alert(1)">click</a>')).toBe(true);
  });

  it('should detect iframe tags', () => {
    expect(hasDangerousHtml('<iframe src="evil.com"></iframe>')).toBe(true);
  });

  it('should detect object/embed tags', () => {
    expect(hasDangerousHtml('<object data="evil.swf">')).toBe(true);
    expect(hasDangerousHtml('<embed src="evil.swf">')).toBe(true);
  });

  it('should not flag safe HTML', () => {
    expect(hasDangerousHtml('<p>Hello world</p>')).toBe(false);
    expect(hasDangerousHtml('<b>bold text</b>')).toBe(false);
    expect(hasDangerousHtml('<a href="https://safe.com">link</a>')).toBe(false);
  });
});

describe('encodeHtmlEntities', () => {
  it('should encode < and >', () => {
    expect(encodeHtmlEntities('<script>')).toBe('&lt;script&gt;');
  });

  it('should encode ampersand', () => {
    expect(encodeHtmlEntities('a & b')).toBe('a &amp; b');
  });

  it('should encode quotes', () => {
    expect(encodeHtmlEntities('"hello"')).toBe('&quot;hello&quot;');
    expect(encodeHtmlEntities("it's")).toBe('it&#x27;s');
  });

  it('should handle multiple entities', () => {
    expect(encodeHtmlEntities('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;');
  });

  it('should not modify safe text', () => {
    expect(encodeHtmlEntities('Hello world 123')).toBe('Hello world 123');
  });
});

describe('sanitize', () => {
  it('should trim whitespace by default', () => {
    const result = sanitize('  hello  ');
    expect(result.value).toBe('hello');
    expect(result.wasModified).toBe(true);
    expect(result.actions).toContain('trimmed');
  });

  it('should enforce length limit', () => {
    const result = sanitize('a'.repeat(20000), { maxLength: 100 });
    expect(result.value.length).toBe(100);
    expect(result.actions).toContain('truncated_to_100');
  });

  it('should remove null bytes', () => {
    const result = sanitize('hello\0world');
    expect(result.value).toBe('helloworld');
    expect(result.hasDangerousContent).toBe(true);
    expect(result.actions).toContain('removed_null_bytes');
  });

  it('should strip HTML tags', () => {
    const result = sanitize('<script>alert("xss")</script>Hello');
    expect(result.value).not.toContain('<script>');
    expect(result.value).toContain('Hello');
    expect(result.hasDangerousContent).toBe(true);
  });

  it('should detect and escape SQL injection', () => {
    const result = sanitize("' OR 1=1--");
    expect(result.hasDangerousContent).toBe(true);
    expect(result.actions).toContain('sql_injection_detected');
    expect(result.actions).toContain('sql_chars_escaped');
  });

  it('should detect and sanitize path traversal', () => {
    const result = sanitize('../../etc/passwd');
    expect(result.hasDangerousContent).toBe(true);
    expect(result.actions).toContain('path_traversal_detected');
    expect(result.value).not.toContain('..');
  });

  it('should not modify safe strings', () => {
    const result = sanitize('Hello, world!');
    expect(result.value).toBe('Hello, world!');
    expect(result.wasModified).toBe(false);
    expect(result.hasDangerousContent).toBe(false);
  });

  it('should respect disabled options', () => {
    const input = '<b>bold</b>';
    const result = sanitize(input, { stripHtml: false, trim: false });
    expect(result.value).toBe(input);
  });

  it('should handle multiple threats in one string', () => {
    const result = sanitize("<script>alert('xss')</script>../../etc/passwd; DROP TABLE users;--");
    expect(result.hasDangerousContent).toBe(true);
    expect(result.value).not.toContain('<script>');
    expect(result.value).not.toContain('..');
  });

  it('should preserve allowed tags when configured', () => {
    const result = sanitize('<b>bold</b> <script>evil</script>', {
      allowedTags: ['b'],
    });
    expect(result.value).toContain('<b>');
    expect(result.value).not.toContain('<script>');
  });

  it('should use default maxLength of 10000', () => {
    const result = sanitize('a'.repeat(10001));
    expect(result.value.length).toBe(10000);
  });
});

describe('sanitizeObject', () => {
  it('should sanitize string properties', () => {
    const result = sanitizeObject({
      name: '<script>xss</script>John',
      age: 30,
    });

    expect(result.value.name).not.toContain('<script>');
    expect(result.value.age).toBe(30);
  });

  it('should sanitize nested objects', () => {
    const result = sanitizeObject({
      user: {
        name: '<b>Test</b>',
        bio: "'; DROP TABLE users;--",
      },
    });

    expect(result.value.user).toBeDefined();
    expect(result.hasDangerousContent).toBe(true);
  });

  it('should sanitize arrays', () => {
    const result = sanitizeObject({
      tags: ['<script>x</script>', 'safe', '../../etc'],
    });

    const tags = result.value.tags as string[];
    expect(tags[0]).not.toContain('<script>');
    expect(tags[1]).toBe('safe');
    expect(result.hasDangerousContent).toBe(true);
  });

  it('should handle null and undefined values', () => {
    const result = sanitizeObject({
      a: null,
      b: undefined,
      c: 'safe',
    });

    expect(result.value.a).toBeNull();
    expect(result.value.b).toBeUndefined();
    expect(result.value.c).toBe('safe');
  });

  it('should not modify non-string primitives', () => {
    const result = sanitizeObject({
      num: 42,
      bool: true,
      str: 'hello',
    });

    expect(result.value.num).toBe(42);
    expect(result.value.bool).toBe(true);
    expect(result.value.str).toBe('hello');
    expect(result.hasDangerousContent).toBe(false);
  });
});

describe('sanitizeLarkApiParam', () => {
  it('should sanitize normal parameters', () => {
    const result = sanitizeLarkApiParam('Meeting #42');
    expect(result).toBe('Meeting #42');
  });

  it('should enforce custom max length', () => {
    const result = sanitizeLarkApiParam('a'.repeat(300), 100);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('should remove control characters', () => {
    const result = sanitizeLarkApiParam('hello\x01\x02world');
    expect(result).toBe('helloworld');
  });

  it('should strip HTML from parameters', () => {
    const result = sanitizeLarkApiParam('<script>alert(1)</script>test');
    expect(result).not.toContain('<script>');
    expect(result).toContain('test');
  });

  it('should handle CJK characters', () => {
    const result = sanitizeLarkApiParam('会議の議事録');
    expect(result).toBe('会議の議事録');
  });

  it('should handle SQL injection in params', () => {
    const result = sanitizeLarkApiParam("'; DROP TABLE meetings;--");
    // SQL dangerous chars should be escaped or removed
    expect(result).not.toContain("'; DROP TABLE");
    expect(result).not.toBe("'; DROP TABLE meetings;--");
  });

  it('should preserve safe punctuation', () => {
    const result = sanitizeLarkApiParam('Meeting: 2025-01-01 (Draft)');
    expect(result).toContain('Meeting');
    expect(result).toContain('2025-01-01');
  });
});
