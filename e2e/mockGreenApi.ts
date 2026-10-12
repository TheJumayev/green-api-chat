import type { Page } from '@playwright/test';

export const ID_INSTANCE = '1101234567';
export const API_TOKEN = 'a'.repeat(40);
export const API_URL = 'https://api.green-api.com';
export const PHONE = '998901234567';
export const CHAT_ID = `${PHONE}@c.us`;

type InstanceState = 'authorized' | 'notAuthorized' | 'blocked' | 'starting';

export interface Notification {
  receiptId: number;
  body: Record<string, unknown>;
}

export interface MockOptions {
  state?: InstanceState;
  /** sendMessage отвечает ошибкой 400. */
  failSend?: boolean;
}

export interface MockGreenApi {
  calls: {
    getStateInstance: number;
    setSettings: Array<Record<string, unknown>>;
    sendMessage: Array<{ url: string; method: string; body: Record<string, unknown> }>;
    deleted: Array<{ receiptId: number; method: string }>;
  };
  /** Положить уведомление в очередь — его заберёт следующий receiveNotification. */
  push: (notification: Notification) => void;
}

/**
 * Поднимает подставной GREEN-API поверх сетевого слоя страницы.
 *
 * Отвечает ровно так, как описано в документации: receiveNotification по
 * таймауту возвращает пустое тело, deleteNotification принимает DELETE,
 * sendMessage отдаёт idMessage.
 */
export async function mockGreenApi(page: Page, options: MockOptions = {}): Promise<MockGreenApi> {
  const { state = 'authorized', failSend = false } = options;

  const calls: MockGreenApi['calls'] = {
    getStateInstance: 0,
    setSettings: [],
    sendMessage: [],
    deleted: [],
  };

  const queue: Notification[] = [];
  let sequence = 0;

  const json = (payload: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });

  // Предикат, а не glob: шаблон вида '**/waInstance**' здесь не срабатывает.
  await page.route(
    (url) => url.href.includes('waInstance'),
    async (route) => {
      const request = route.request();
      const url = request.url();

      if (url.includes('/getStateInstance/')) {
        calls.getStateInstance += 1;
        return route.fulfill(json({ stateInstance: state }));
      }

      if (url.includes('/setSettings/')) {
        calls.setSettings.push(JSON.parse(request.postData() ?? '{}'));
        return route.fulfill(json({ saveSettings: true }));
      }

      if (url.includes('/sendMessage/')) {
        calls.sendMessage.push({
          url,
          method: request.method(),
          body: JSON.parse(request.postData() ?? '{}'),
        });
        if (failSend) {
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Validation failed' }),
          });
        }
        sequence += 1;
        return route.fulfill(json({ idMessage: `srv-${sequence}` }));
      }

      if (url.includes('/receiveNotification/')) {
        const next = queue.shift();
        if (next) return route.fulfill(json(next));
        // Таймаут long polling: пустое тело, как у настоящего API.
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return route.fulfill({ status: 200, body: '' });
      }

      if (url.includes('/deleteNotification/')) {
        calls.deleted.push({ receiptId: Number(url.split('/').pop()), method: request.method() });
        return route.fulfill(json({ result: true, reason: '' }));
      }

      return route.fulfill({ status: 404, body: '' });
    },
  );

  return { calls, push: (n) => queue.push(n) };
}

/** Записывает учётные данные, чтобы тест начинался сразу с экрана чатов. */
export async function signIn(page: Page): Promise<void> {
  await page.addInitScript(
    ({ idInstance, apiTokenInstance, apiUrl }) => {
      localStorage.setItem(
        'green-api-chat:credentials:v1',
        JSON.stringify({ idInstance, apiTokenInstance, apiUrl }),
      );
    },
    { idInstance: ID_INSTANCE, apiTokenInstance: API_TOKEN, apiUrl: API_URL },
  );
}

export function incomingText(
  receiptId: number,
  idMessage: string,
  textMessage: string,
): Notification {
  return {
    receiptId,
    body: {
      typeWebhook: 'incomingMessageReceived',
      timestamp: Math.floor(Date.now() / 1000),
      idMessage,
      senderData: { chatId: CHAT_ID, senderName: 'Дарья', chatName: 'Дарья' },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage } },
    },
  };
}

export async function openChat(page: Page, phone = PHONE): Promise<void> {
  await page.getByRole('button', { name: 'Новый чат' }).click();
  await page.getByLabel('Номер телефона').fill(phone);
  await page.getByRole('button', { name: 'Начать чат' }).click();
}
