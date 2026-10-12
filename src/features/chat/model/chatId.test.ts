import { describe, expect, it } from 'vitest';
import { formatPhone, isGroupChat, PhoneValidationError, toChatId, toPhone } from './chatId';

describe('toChatId', () => {
  it('убирает форматирование и добавляет суффикс личного чата', () => {
    expect(toChatId('+998 90 123-45-67')).toBe('998901234567@c.us');
    expect(toChatId('(79991234567)')).toBe('79991234567@c.us');
  });

  it('требует непустой номер', () => {
    expect(() => toChatId('   ')).toThrow(PhoneValidationError);
  });

  it('отклоняет слишком короткие и слишком длинные номера', () => {
    expect(() => toChatId('12345')).toThrow(PhoneValidationError);
    expect(() => toChatId('1234567890123456')).toThrow(PhoneValidationError);
  });

  it('отклоняет местный формат с ведущим нулём', () => {
    expect(() => toChatId('0901234567')).toThrow(/международном формате/);
  });
});

describe('toPhone', () => {
  it('возвращает цифры без суффикса', () => {
    expect(toPhone('998901234567@c.us')).toBe('998901234567');
  });
});

describe('formatPhone', () => {
  it('разбивает номер на группы', () => {
    expect(formatPhone('998901234567@c.us')).toBe('+998 90 123 45 67');
  });

  it('возвращает исходное значение, если это не номер', () => {
    expect(formatPhone('support@c.us')).toBe('support@c.us');
  });
});

describe('isGroupChat', () => {
  it('различает личные и групповые чаты', () => {
    expect(isGroupChat('123@g.us')).toBe(true);
    expect(isGroupChat('123@c.us')).toBe(false);
  });
});
