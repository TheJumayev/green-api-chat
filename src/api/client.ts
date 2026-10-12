import { ApiError, type ApiErrorKind, type Credentials } from './types';

/**
 * Базовый URL собирается ровно в одном месте.
 * Если GREEN-API не отдаёт CORS-заголовки, достаточно включить VITE_USE_PROXY —
 * весь остальной код не меняется (см. README, раздел «CORS»).
 */
const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true';

export function buildUrl(c: Credentials, method: string, suffix = ''): string {
  const origin = USE_PROXY ? '/green-api' : c.apiUrl.replace(/\/+$/, '');
  return `${origin}/waInstance${c.idInstance}/${method}/${c.apiTokenInstance}${suffix}`;
}

function kindFromStatus(status: number, body: string): ApiErrorKind {
  if (status === 401 || status === 403) {
    return /suspend/i.test(body) ? 'suspended' : 'unauthorized';
  }
  if (status === 400) return 'validation';
  if (status === 429) return 'rateLimit';
  if (status >= 500) return 'server';
  return 'unknown';
}

export interface CallOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  suffix?: string;
  signal?: AbortSignal;
}

/**
 * Единая точка вызова GREEN-API.
 *
 * Ответ читается через text(), а не json(): receiveNotification по таймауту
 * возвращает пустое тело, и json() на нём падает.
 */
export async function call<T>(
  credentials: Credentials,
  endpoint: string,
  options: CallOptions = {},
): Promise<T | null> {
  const { method = 'GET', body, suffix = '', signal } = options;
  const url = buildUrl(credentials, endpoint, suffix);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      ...(body === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new ApiError('aborted', 'Запрос отменён');
    }
    // fetch бросает TypeError и при обрыве сети, и при блокировке CORS —
    // различить их из браузера нельзя, поэтому сообщение покрывает оба случая.
    throw new ApiError(
      'network',
      'Не удалось связаться с GREEN-API. Проверьте подключение к интернету и адрес API.',
    );
  }

  const text = await response.text();

  if (!response.ok) {
    throw new ApiError(
      kindFromStatus(response.status, text),
      describeError(response.status, text),
      response.status,
    );
  }

  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('unknown', 'Сервер вернул неожиданный ответ');
  }
}

function describeError(status: number, body: string): string {
  switch (status) {
    case 400:
      return 'Неверные параметры запроса. Проверьте номер телефона и текст сообщения.';
    case 401:
      return 'Неверный idInstance или apiTokenInstance.';
    case 403:
      return /suspend/i.test(body)
        ? 'Аккаунт временно заблокирован GREEN-API.'
        : 'Доступ запрещён. Проверьте учётные данные инстанса.';
    case 429:
      return 'Слишком много запросов. Подождите несколько секунд.';
    default:
      return status >= 500
        ? 'Сервис GREEN-API временно недоступен.'
        : `Ошибка запроса (${status}).`;
  }
}
