import { deleteNotification, receiveNotification } from '../greenApi';
import { ApiError, type Credentials } from '../types';
import type { NotificationTransport, TransportHandlers } from './types';

const RECEIVE_TIMEOUT_SEC = 20;
const BACKOFF_START_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
/**
 * Если сервер отвечает «пусто» мгновенно (неверные настройки инстанса,
 * прокси со своим таймаутом), цикл без паузы превратится в busy loop.
 */
const MIN_EMPTY_ROUNDTRIP_MS = 1_000;
const IDLE_PAUSE_MS = 1_000;

export interface PollingOptions {
  receiveTimeout?: number;
  /** Подменяется в тестах, чтобы не ждать реального времени. */
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

function defaultSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
  });
}

/**
 * HTTP API long polling — технология приёма, указанная в задании.
 *
 * Цикл строго последовательный: получили уведомление → обработали →
 * удалили → снова получаем. Удаление в finally: если обработчик упадёт,
 * уведомление всё равно нужно убрать из очереди, иначе она встанет.
 */
export function createPollingTransport(
  credentials: Credentials,
  options: PollingOptions = {},
): NotificationTransport {
  const { receiveTimeout = RECEIVE_TIMEOUT_SEC, sleep = defaultSleep } = options;
  let controller: AbortController | null = null;

  async function loop(signal: AbortSignal, handlers: TransportHandlers): Promise<void> {
    let backoff = BACKOFF_START_MS;

    while (!signal.aborted) {
      try {
        const startedAt = Date.now();
        const notification = await receiveNotification(credentials, receiveTimeout, signal);

        if (signal.aborted) break;
        handlers.onStatusChange('connected');
        backoff = BACKOFF_START_MS;

        if (!notification) {
          if (Date.now() - startedAt < MIN_EMPTY_ROUNDTRIP_MS) {
            await sleep(IDLE_PAUSE_MS, signal);
          }
          continue;
        }

        try {
          handlers.onNotification(notification.body);
        } finally {
          await deleteNotification(credentials, notification.receiptId).catch(() => {
            // Сеть могла моргнуть. Уведомление придёт повторно и будет
            // отброшено дедупликацией по idMessage — это безопасно.
          });
        }
      } catch (error) {
        if (signal.aborted || (error instanceof ApiError && error.kind === 'aborted')) break;

        handlers.onStatusChange(
          error instanceof ApiError && error.kind === 'unauthorized' ? 'error' : 'reconnecting',
        );

        await sleep(backoff, signal);
        backoff = Math.min(backoff * 2, BACKOFF_MAX_MS);
      }
    }
  }

  return {
    start(handlers) {
      // Защита от повторного запуска: React StrictMode в dev вызывает эффект дважды.
      if (controller) return;
      controller = new AbortController();
      handlers.onStatusChange('reconnecting');
      void loop(controller.signal, handlers);
    },

    stop() {
      controller?.abort();
      controller = null;
    },
  };
}
