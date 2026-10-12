export class PhoneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhoneValidationError';
  }
}

const MIN_DIGITS = 10;
const MAX_DIGITS = 15;

/**
 * Телефон в произвольном виде → chatId для личного чата.
 * "+998 90 123-45-67" → "998901234567@c.us"
 */
export function toChatId(input: string): string {
  const digits = input.replace(/\D/g, '');

  if (digits.length === 0) {
    throw new PhoneValidationError('Введите номер телефона');
  }
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) {
    throw new PhoneValidationError(
      `Номер должен содержать от ${MIN_DIGITS} до ${MAX_DIGITS} цифр с кодом страны`,
    );
  }
  if (digits.startsWith('0')) {
    throw new PhoneValidationError('Укажите номер в международном формате, без ведущего нуля');
  }

  return `${digits}@c.us`;
}

/** "998901234567@c.us" → "998901234567" */
export function toPhone(chatId: string): string {
  return chatId.split('@')[0] ?? chatId;
}

/** "998901234567" → "+998 90 123 45 67" — только для отображения. */
export function formatPhone(chatId: string): string {
  const digits = toPhone(chatId);
  if (!/^\d+$/.test(digits)) return chatId;

  const groups = digits.length > 9 ? [3, 2, 3, 2, 2] : [3, 3, 3];
  const parts: string[] = [];
  let offset = 0;

  for (const size of groups) {
    if (offset >= digits.length) break;
    parts.push(digits.slice(offset, offset + size));
    offset += size;
  }
  if (offset < digits.length) parts.push(digits.slice(offset));

  return `+${parts.join(' ')}`;
}

/** Групповые чаты в этом задании не поддерживаются (требование: только личные). */
export function isGroupChat(chatId: string): boolean {
  return chatId.endsWith('@g.us');
}
