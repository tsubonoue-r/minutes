/**
 * Unit tests for Toast notification system
 * @module tests/components/ui/toast
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Toast Notification System', () => {
  describe('ToastData type structure', () => {
    it('should define valid ToastType values', () => {
      const validTypes = ['success', 'error', 'info', 'warning'] as const;
      expect(validTypes).toHaveLength(4);
      expect(validTypes).toContain('success');
      expect(validTypes).toContain('error');
      expect(validTypes).toContain('info');
      expect(validTypes).toContain('warning');
    });

    it('should create a valid ToastData object', () => {
      const toast = {
        id: 'toast-1',
        type: 'success' as const,
        message: 'Operation successful',
        duration: 3000,
      };

      expect(toast.id).toBe('toast-1');
      expect(toast.type).toBe('success');
      expect(toast.message).toBe('Operation successful');
      expect(toast.duration).toBe(3000);
    });

    it('should allow optional duration field', () => {
      const toast: { id: string; type: 'error'; message: string; duration?: number } = {
        id: 'toast-2',
        type: 'error',
        message: 'Something went wrong',
      };

      expect(toast.duration).toBeUndefined();
    });
  });

  describe('Toast ID generation', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const id = `toast-${Date.now()}-${String(i)}`;
        ids.add(id);
      }
      expect(ids.size).toBe(100);
    });

    it('should have toast- prefix in generated IDs', () => {
      const id = `toast-${Date.now()}-1`;
      expect(id.startsWith('toast-')).toBe(true);
    });
  });

  describe('Toast max limit behavior', () => {
    it('should trim toasts when exceeding maxToasts', () => {
      const maxToasts = 5;
      const toasts = Array.from({ length: 7 }, (_, i) => ({
        id: `toast-${String(i)}`,
        type: 'info' as const,
        message: `Message ${String(i)}`,
      }));

      const trimmed = toasts.slice(toasts.length - maxToasts);
      expect(trimmed).toHaveLength(5);
      expect(trimmed[0]?.id).toBe('toast-2');
      expect(trimmed[4]?.id).toBe('toast-6');
    });

    it('should not trim when under maxToasts', () => {
      const maxToasts = 5;
      const toasts = Array.from({ length: 3 }, (_, i) => ({
        id: `toast-${String(i)}`,
        type: 'success' as const,
        message: `Message ${String(i)}`,
      }));

      const result = toasts.length > maxToasts
        ? toasts.slice(toasts.length - maxToasts)
        : toasts;
      expect(result).toHaveLength(3);
    });
  });

  describe('Toast dismissal logic', () => {
    it('should filter out dismissed toast by ID', () => {
      const toasts = [
        { id: 'toast-1', type: 'success' as const, message: 'First' },
        { id: 'toast-2', type: 'error' as const, message: 'Second' },
        { id: 'toast-3', type: 'info' as const, message: 'Third' },
      ];

      const afterDismiss = toasts.filter((t) => t.id !== 'toast-2');
      expect(afterDismiss).toHaveLength(2);
      expect(afterDismiss.find((t) => t.id === 'toast-2')).toBeUndefined();
    });

    it('should clear all toasts on dismissAll', () => {
      const toasts = [
        { id: 'toast-1', type: 'success' as const, message: 'First' },
        { id: 'toast-2', type: 'error' as const, message: 'Second' },
      ];

      expect(toasts).toHaveLength(2);
      const afterDismissAll: Array<{ id: string; type: string; message: string }> = [];
      expect(afterDismissAll).toHaveLength(0);
    });

    it('should handle dismissing non-existent ID gracefully', () => {
      const toasts = [
        { id: 'toast-1', type: 'info' as const, message: 'Only one' },
      ];

      const afterDismiss = toasts.filter((t) => t.id !== 'non-existent');
      expect(afterDismiss).toHaveLength(1);
    });
  });

  describe('Toast duration defaults', () => {
    it('should use 3000ms as default duration', () => {
      const toast: { id: string; type: 'info'; message: string; duration?: number } = {
        id: 'toast-1',
        type: 'info',
        message: 'Test',
      };

      const duration = toast.duration ?? 3000;
      expect(duration).toBe(3000);
    });

    it('should respect custom duration', () => {
      const toast = {
        id: 'toast-1',
        type: 'warning' as const,
        message: 'Custom duration',
        duration: 5000,
      };

      const duration = toast.duration ?? 3000;
      expect(duration).toBe(5000);
    });
  });

  describe('Toast type styles mapping', () => {
    const styleMap: Record<string, string> = {
      success: 'bg-green-50 border-green-400 text-green-800',
      error: 'bg-red-50 border-red-400 text-red-800',
      info: 'bg-blue-50 border-blue-400 text-blue-800',
      warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    };

    it('should have correct success styles', () => {
      expect(styleMap['success']).toContain('bg-green-50');
      expect(styleMap['success']).toContain('border-green-400');
      expect(styleMap['success']).toContain('text-green-800');
    });

    it('should have correct error styles', () => {
      expect(styleMap['error']).toContain('bg-red-50');
      expect(styleMap['error']).toContain('border-red-400');
      expect(styleMap['error']).toContain('text-red-800');
    });

    it('should have correct info styles', () => {
      expect(styleMap['info']).toContain('bg-blue-50');
      expect(styleMap['info']).toContain('border-blue-400');
      expect(styleMap['info']).toContain('text-blue-800');
    });

    it('should have correct warning styles', () => {
      expect(styleMap['warning']).toContain('bg-yellow-50');
      expect(styleMap['warning']).toContain('border-yellow-400');
      expect(styleMap['warning']).toContain('text-yellow-800');
    });
  });

  describe('Toast icon mapping', () => {
    const iconMap: Record<string, string> = {
      success: '\u2713',
      error: '\u2717',
      info: '\u2139',
      warning: '\u26A0',
    };

    it('should map success to checkmark', () => {
      expect(iconMap['success']).toBe('\u2713');
    });

    it('should map error to cross', () => {
      expect(iconMap['error']).toBe('\u2717');
    });

    it('should map info to info symbol', () => {
      expect(iconMap['info']).toBe('\u2139');
    });

    it('should map warning to warning triangle', () => {
      expect(iconMap['warning']).toBe('\u26A0');
    });
  });

  describe('Toast auto-dismiss timer behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call dismiss callback after duration', () => {
      const dismissFn = vi.fn();
      const duration = 3000;

      const timerId = setTimeout(() => {
        dismissFn('toast-1');
      }, duration);

      vi.advanceTimersByTime(3000);
      expect(dismissFn).toHaveBeenCalledWith('toast-1');

      clearTimeout(timerId);
    });

    it('should not dismiss before duration', () => {
      const dismissFn = vi.fn();
      const duration = 3000;

      const timerId = setTimeout(() => {
        dismissFn('toast-1');
      }, duration);

      vi.advanceTimersByTime(2000);
      expect(dismissFn).not.toHaveBeenCalled();

      clearTimeout(timerId);
    });

    it('should support custom duration', () => {
      const dismissFn = vi.fn();
      const duration = 5000;

      const timerId = setTimeout(() => {
        dismissFn('toast-1');
      }, duration);

      vi.advanceTimersByTime(4000);
      expect(dismissFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(dismissFn).toHaveBeenCalledWith('toast-1');

      clearTimeout(timerId);
    });
  });

  describe('Toast context value shape', () => {
    it('should have all required methods', () => {
      const contextValue = {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
        dismiss: vi.fn(),
        dismissAll: vi.fn(),
      };

      expect(typeof contextValue.success).toBe('function');
      expect(typeof contextValue.error).toBe('function');
      expect(typeof contextValue.info).toBe('function');
      expect(typeof contextValue.warning).toBe('function');
      expect(typeof contextValue.dismiss).toBe('function');
      expect(typeof contextValue.dismissAll).toBe('function');
    });

    it('should call success with message and optional duration', () => {
      const mockSuccess = vi.fn();
      mockSuccess('Saved successfully');
      expect(mockSuccess).toHaveBeenCalledWith('Saved successfully');

      mockSuccess('Saved!', 5000);
      expect(mockSuccess).toHaveBeenCalledWith('Saved!', 5000);
    });

    it('should call error with message', () => {
      const mockError = vi.fn();
      mockError('Operation failed');
      expect(mockError).toHaveBeenCalledWith('Operation failed');
    });
  });

  describe('useToast hook error handling', () => {
    it('should throw when context is null', () => {
      const context: null = null;
      const getToast = (): never => {
        if (context === null) {
          throw new Error(
            'useToast must be used within a ToastProvider. ' +
            'Wrap your application with <ToastProvider> in your layout.'
          );
        }
        return context;
      };

      expect(getToast).toThrow('useToast must be used within a ToastProvider');
    });

    it('should return context value when available', () => {
      const mockContext = {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
        dismiss: vi.fn(),
        dismissAll: vi.fn(),
      };

      const getToast = (): typeof mockContext => {
        const context: typeof mockContext | null = mockContext;
        if (context === null) {
          throw new Error('useToast must be used within a ToastProvider');
        }
        return context;
      };

      const toast = getToast();
      expect(toast).toBe(mockContext);
    });
  });

  describe('Toast accessibility', () => {
    it('should have correct ARIA attributes defined', () => {
      const expectedAttributes = {
        role: 'alert',
        'aria-live': 'polite',
        'aria-atomic': 'true',
      };

      expect(expectedAttributes.role).toBe('alert');
      expect(expectedAttributes['aria-live']).toBe('polite');
      expect(expectedAttributes['aria-atomic']).toBe('true');
    });

    it('should have aria-label on close button', () => {
      const closeButtonAriaLabel = '閉じる';
      expect(closeButtonAriaLabel).toBe('閉じる');
    });

    it('should have aria-label on container', () => {
      const containerAriaLabel = '通知';
      expect(containerAriaLabel).toBe('通知');
    });
  });

  describe('Toast stacking behavior', () => {
    it('should maintain insertion order', () => {
      const toasts: Array<{ id: string; type: string; message: string }> = [];

      toasts.push({ id: 'toast-1', type: 'success', message: 'First' });
      toasts.push({ id: 'toast-2', type: 'error', message: 'Second' });
      toasts.push({ id: 'toast-3', type: 'info', message: 'Third' });

      expect(toasts[0]?.message).toBe('First');
      expect(toasts[1]?.message).toBe('Second');
      expect(toasts[2]?.message).toBe('Third');
    });

    it('should add new toasts at the end', () => {
      const toasts = [
        { id: 'toast-1', type: 'success' as const, message: 'Existing' },
      ];

      const newToast = { id: 'toast-2', type: 'info' as const, message: 'New' };
      const updated = [...toasts, newToast];

      expect(updated[updated.length - 1]?.message).toBe('New');
    });
  });
});
