import { ru } from '@/i18n/ru';

const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const dateWithYear = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Unix-секунды → "14:05" */
export function formatTime(timestamp: number): string {
  return time.format(new Date(timestamp * 1000));
}

/** Ключ дня для группировки сообщений: "2026-10-12". */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Подпись разделителя: «Сегодня», «Вчера» или дата. */
export function formatDay(timestamp: number, now = new Date()): string {
  const d = new Date(timestamp * 1000);

  if (dayKey(timestamp) === dayKey(Math.floor(now.getTime() / 1000))) {
    return ru.chat.today;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(timestamp) === dayKey(Math.floor(yesterday.getTime() / 1000))) {
    return ru.chat.yesterday;
  }

  return d.getFullYear() === now.getFullYear() ? date.format(d) : dateWithYear.format(d);
}

/** Время в списке чатов: сегодня — часы, иначе дата. */
export function formatListTime(timestamp: number, now = new Date()): string {
  if (dayKey(timestamp) === dayKey(Math.floor(now.getTime() / 1000))) {
    return formatTime(timestamp);
  }
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(
    new Date(timestamp * 1000),
  );
}
