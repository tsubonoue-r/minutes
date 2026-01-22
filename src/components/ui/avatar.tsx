'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';

/**
 * アバターのサイズ
 */
export type AvatarSize = 'sm' | 'md' | 'lg';

/**
 * アバターコンポーネントのprops
 */
export interface AvatarProps {
  /** 画像URL */
  src?: string | null | undefined;
  /** ユーザー名（イニシャル表示用） */
  name: string;
  /** サイズ */
  size?: AvatarSize;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * サイズに応じたスタイルを取得
 */
function getSizeStyles(size: AvatarSize): { container: string; text: string } {
  const styles: Record<AvatarSize, { container: string; text: string }> = {
    sm: { container: 'w-8 h-8', text: 'text-xs' },
    md: { container: 'w-10 h-10', text: 'text-sm' },
    lg: { container: 'w-14 h-14', text: 'text-lg' },
  };
  return styles[size];
}

/**
 * 名前からイニシャルを取得
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 0 || parts[0] === '') {
    return '?';
  }

  if (parts.length === 1) {
    const firstPart = parts[0];
    // 日本語名の場合は最初の1文字
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(firstPart ?? '')) {
      return (firstPart ?? '?').charAt(0);
    }
    // 英語名の場合は最初の2文字
    return (firstPart ?? '?').substring(0, 2).toUpperCase();
  }

  // 2語以上の場合は最初の2語の頭文字
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts[parts.length - 1]?.charAt(0) ?? '';
  return (first + last).toUpperCase();
}

/**
 * 名前からハッシュ値を計算して色を決定
 */
function getColorFromName(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index] ?? 'bg-gray-500';
}

/**
 * アバターコンポーネント
 *
 * @description ユーザーアバター。画像がない場合はイニシャルを表示
 * @example
 * ```tsx
 * <Avatar src="/avatar.jpg" name="山田太郎" size="md" />
 * <Avatar name="John Doe" size="lg" />
 * ```
 */
/**
 * サイズに応じたピクセル値を取得
 */
function getSizePixels(size: AvatarSize): number {
  const pixels: Record<AvatarSize, number> = {
    sm: 32,
    md: 40,
    lg: 56,
  };
  return pixels[size];
}

export function Avatar({
  src,
  name,
  size = 'md',
  className = '',
}: AvatarProps): JSX.Element {
  const [imageError, setImageError] = useState(false);
  const sizeStyles = getSizeStyles(size);
  const sizePixels = getSizePixels(size);
  const hasValidSrc = typeof src === 'string' && src.length > 0;
  const showImage = hasValidSrc && !imageError;

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  return (
    <div
      className={`
        ${sizeStyles.container}
        relative inline-flex items-center justify-center
        rounded-full overflow-hidden
        flex-shrink-0
        ${showImage ? '' : getColorFromName(name)}
        ${className}
      `}
      title={name}
    >
      {showImage ? (
        <Image
          src={src}
          alt={name}
          width={sizePixels}
          height={sizePixels}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <span
          className={`
            ${sizeStyles.text}
            font-medium text-white
            select-none
          `}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}

/**
 * アバターグループコンポーネントのprops
 */
export interface AvatarGroupProps {
  /** アバターのリスト */
  avatars: Array<{ src?: string | null | undefined; name: string }>;
  /** 表示する最大数 */
  max?: number;
  /** サイズ */
  size?: AvatarSize;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * アバターグループコンポーネント
 *
 * @description 複数のアバターを重ねて表示
 * @example
 * ```tsx
 * <AvatarGroup
 *   avatars={[
 *     { name: '山田太郎' },
 *     { name: '鈴木花子', src: '/avatar.jpg' },
 *   ]}
 *   max={3}
 * />
 * ```
 */
export function AvatarGroup({
  avatars,
  max = 4,
  size = 'sm',
  className = '',
}: AvatarGroupProps): JSX.Element {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;
  const sizeStyles = getSizeStyles(size);

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visibleAvatars.map((avatar, index) => (
        <div
          key={index}
          className="ring-2 ring-white rounded-full"
          style={{ zIndex: visibleAvatars.length - index }}
        >
          <Avatar src={avatar.src} name={avatar.name} size={size} />
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={`
            ${sizeStyles.container}
            inline-flex items-center justify-center
            rounded-full bg-gray-200 text-gray-600
            ring-2 ring-white
            ${sizeStyles.text}
            font-medium
          `}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
