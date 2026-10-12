import { useMemo } from 'react';
import styles from './ui.module.css';

/** Палитра подобрана так, чтобы белый текст оставался читаемым на любом цвете. */
const PALETTE = [
  '#e8505b',
  '#f08a4b',
  '#d7a32b',
  '#2bc644',
  '#17a2a2',
  '#007aff',
  '#7a5af8',
  '#c44ab0',
] as const;

/** Стабильный хеш: один и тот же номер всегда получает один и тот же цвет. */
function hash(value: string): number {
  let acc = 0;
  for (let i = 0; i < value.length; i += 1) {
    acc = (acc * 31 + value.charCodeAt(i)) >>> 0;
  }
  return acc;
}

function initials(source: string): string {
  const name = source.trim();
  if (!name) return '?';

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && /\p{L}/u.test(words[0]![0]!)) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase();
  }
  if (/\p{L}/u.test(name[0]!)) {
    return name.slice(0, 2).toUpperCase();
  }
  // Номер телефона — показываем две последние цифры.
  const digits = name.replace(/\D/g, '');
  return digits.slice(-2) || '?';
}

interface AvatarProps {
  /** Ключ для цвета — обычно chatId. */
  seed: string;
  /** Что показать: имя или номер. */
  title: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ seed, title, size = 'md' }: AvatarProps) {
  const background = useMemo(() => PALETTE[hash(seed) % PALETTE.length]!, [seed]);
  const sizeClass =
    size === 'sm' ? styles.avatarSm : size === 'lg' ? styles.avatarLg : styles.avatarMd;

  return (
    <span
      className={[styles.avatar, sizeClass].join(' ')}
      style={{ background }}
      aria-hidden="true"
    >
      {initials(title)}
    </span>
  );
}
