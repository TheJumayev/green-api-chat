import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Credentials, Notification } from '../types';
import { ApiError } from '../types';

const receiveNotification = vi.fn();
const deleteNotification = vi.fn();

vi.mock('../greenApi', () => ({
  receiveNotification: (...args: unknown[]) => receiveNotification(...args),
  deleteNotification: (...args: unknown[]) => deleteNotification(...args),
}));

const { createPollingTransport } = await import('./polling');

const credentials: Credentials = {
  idInstance: '1',
  apiTokenInstance: 'token',
  apiUrl: 'https://api.green-api.com',
};

function notification(receiptId: number, text: string): Notification {
  return {
    receiptId,
    body: {
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1,
      idMessage: `m${receiptId}`,
      senderData: { chatId: '1@c.us' },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
    },
  };
}

/**
 * Висящий long poll: имитирует запрос, который ждёт сообщение и не отвечает.
 * Без него цикл крутился бы бесконечно и тест не завершился.
 */
const pending = () => new Promise<never>(() => {});

/** Даёт циклу прокрутиться — он весь на микрозадачах. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const noSleep = () => Promise.resolve();

beforeEach(() => {
  receiveNotification.mockReset();
  deleteNotification.mockReset();
  deleteNotification.mockResolvedValue({ result: true, reason: '' });
});

describe('createPollingTransport', () => {
  it('передаёт уведомление и подтверждает его получение', async () => {
    receiveNotification
      .mockResolvedValueOnce(notification(1, 'привет'))
      .mockImplementation(pending);

    const onNotification = vi.fn();
    const transport = createPollingTransport(credentials, { sleep: noSleep });

    transport.start({ onNotification, onStatusChange: vi.fn() });
    await flush();
    transport.stop();

    expect(onNotification).toHaveBeenCalledTimes(1);
    expect(deleteNotification).toHaveBeenCalledWith(credentials, 1);
  });

  it('удаляет уведомление, даже если обработчик упал', async () => {
    receiveNotification.mockResolvedValueOnce(notification(7, 'бум')).mockImplementation(pending);

    const transport = createPollingTransport(credentials, { sleep: noSleep });
    transport.start({
      onNotification: () => {
        throw new Error('обработчик упал');
      },
      onStatusChange: vi.fn(),
    });
    await flush();
    transport.stop();

    // Иначе очередь встанет и то же уведомление будет приходить бесконечно.
    expect(deleteNotification).toHaveBeenCalledWith(credentials, 7);
  });

  it('обрабатывает несколько уведомлений подряд в порядке очереди', async () => {
    receiveNotification
      .mockResolvedValueOnce(notification(1, 'раз'))
      .mockResolvedValueOnce(notification(2, 'два'))
      .mockImplementation(pending);

    const onNotification = vi.fn();
    const transport = createPollingTransport(credentials, { sleep: noSleep });

    transport.start({ onNotification, onStatusChange: vi.fn() });
    await flush();
    transport.stop();

    expect(onNotification).toHaveBeenCalledTimes(2);
    expect(deleteNotification.mock.calls.map((c) => c[1])).toEqual([1, 2]);
  });

  it('ничего не подтверждает, когда очередь пуста', async () => {
    receiveNotification.mockResolvedValueOnce(null).mockImplementation(pending);

    const transport = createPollingTransport(credentials, { sleep: noSleep });
    transport.start({ onNotification: vi.fn(), onStatusChange: vi.fn() });
    await flush();
    transport.stop();

    expect(deleteNotification).not.toHaveBeenCalled();
  });

  it('переживает сетевую ошибку и продолжает опрос', async () => {
    receiveNotification
      .mockRejectedValueOnce(new ApiError('network', 'нет сети'))
      .mockResolvedValueOnce(notification(2, 'после сбоя'))
      .mockImplementation(pending);

    const onNotification = vi.fn();
    const onStatusChange = vi.fn();
    const transport = createPollingTransport(credentials, { sleep: noSleep });

    transport.start({ onNotification, onStatusChange });
    await flush();
    transport.stop();

    expect(onStatusChange).toHaveBeenCalledWith('reconnecting');
    expect(onNotification).toHaveBeenCalledTimes(1);
  });

  it('не запускает второй цикл при повторном start (StrictMode)', async () => {
    receiveNotification.mockImplementation(pending);

    const transport = createPollingTransport(credentials, { sleep: noSleep });
    const handlers = { onNotification: vi.fn(), onStatusChange: vi.fn() };

    transport.start(handlers);
    transport.start(handlers);
    await flush();
    transport.stop();

    // Один цикл — один висящий запрос. Два цикла дали бы два.
    expect(receiveNotification).toHaveBeenCalledTimes(1);
  });

  it('прекращает опрос после stop()', async () => {
    receiveNotification.mockResolvedValueOnce(notification(1, 'раз')).mockImplementation(pending);

    const transport = createPollingTransport(credentials, { sleep: noSleep });
    transport.start({ onNotification: vi.fn(), onStatusChange: vi.fn() });
    await flush();
    transport.stop();

    const callsAfterStop = receiveNotification.mock.calls.length;
    await flush();

    expect(receiveNotification.mock.calls.length).toBe(callsAfterStop);
  });
});
