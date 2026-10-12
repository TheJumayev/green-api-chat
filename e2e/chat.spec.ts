import { expect, test, type Page } from '@playwright/test';
import {
  API_TOKEN,
  CHAT_ID,
  ID_INSTANCE,
  incomingText,
  mockGreenApi,
  openChat,
  signIn,
} from './mockGreenApi';

/** Лента сообщений: тот же текст виден и в превью сайдбара, поэтому считаем только её. */
const feed = (page: Page) => page.locator('[role="log"]');

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test('отклоняет некорректный номер и форматирует корректный', async ({ page }) => {
  await mockGreenApi(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Новый чат' }).click();
  await page.getByLabel('Номер телефона').fill('123');
  await page.getByRole('button', { name: 'Начать чат' }).click();
  await expect(page.getByText(/от 10 до 15 цифр/)).toBeVisible();

  await page.getByLabel('Номер телефона').fill('+998 90 123-45-67');
  await page.getByRole('button', { name: 'Начать чат' }).click();
  await expect(page.getByRole('heading', { name: '+998 90 123 45 67' })).toBeVisible();
});

test('отправляет сообщение методом SendMessage', async ({ page }) => {
  const api = await mockGreenApi(page);
  await page.goto('/');
  await openChat(page);

  const input = page.getByPlaceholder('Напишите сообщение…');
  await input.fill('Привет из теста');
  await input.press('Enter');

  await expect(feed(page).getByText('Привет из теста')).toBeVisible();
  await expect(input).toHaveValue('');

  const sent = api.calls.sendMessage[0];
  expect(sent?.method).toBe('POST');
  expect(sent?.url).toBe(
    `https://api.green-api.com/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`,
  );
  expect(sent?.body).toEqual({ chatId: CHAT_ID, message: 'Привет из теста' });
});

test('не дублирует собственное сообщение, вернувшееся эхом', async ({ page }) => {
  const api = await mockGreenApi(page);
  await page.goto('/');
  await openChat(page);

  const input = page.getByPlaceholder('Напишите сообщение…');
  await input.fill('Привет из теста');
  await input.press('Enter');
  await expect(feed(page).getByText('Привет из теста')).toHaveCount(1);

  api.push({
    receiptId: 10,
    body: {
      typeWebhook: 'outgoingAPIMessageReceived',
      timestamp: Math.floor(Date.now() / 1000),
      idMessage: 'srv-1',
      senderData: { chatId: CHAT_ID },
      messageData: {
        typeMessage: 'textMessage',
        textMessageData: { textMessage: 'Привет из теста' },
      },
    },
  });

  await expect
    .poll(() => api.calls.deleted.some((d) => d.receiptId === 10), { timeout: 10_000 })
    .toBe(true);
  await expect(feed(page).getByText('Привет из теста')).toHaveCount(1);
});

test('показывает входящее сообщение и подтверждает его получение', async ({ page }) => {
  const api = await mockGreenApi(page);
  await page.goto('/');
  await openChat(page);

  api.push(incomingText(21, 'in-1', 'Ответ от получателя'));

  await expect(feed(page).getByText('Ответ от получателя')).toBeVisible({ timeout: 10_000 });
  // Без deleteNotification очередь встанет и то же уведомление придёт снова.
  expect(api.calls.deleted.some((d) => d.receiptId === 21 && d.method === 'DELETE')).toBe(true);

  // Повторная доставка того же idMessage не должна задвоить сообщение.
  api.push(incomingText(22, 'in-1', 'Ответ от получателя'));
  await expect
    .poll(() => api.calls.deleted.some((d) => d.receiptId === 22), { timeout: 10_000 })
    .toBe(true);
  await expect(feed(page).getByText('Ответ от получателя')).toHaveCount(1);
});

test('пропускает нетекстовые сообщения, но убирает их из очереди', async ({ page }) => {
  const api = await mockGreenApi(page);
  await page.goto('/');
  await openChat(page);

  api.push({
    receiptId: 23,
    body: {
      typeWebhook: 'incomingMessageReceived',
      timestamp: Math.floor(Date.now() / 1000),
      idMessage: 'in-media',
      senderData: { chatId: CHAT_ID },
      messageData: { typeMessage: 'imageMessage' },
    },
  });

  await expect
    .poll(() => api.calls.deleted.some((d) => d.receiptId === 23), { timeout: 10_000 })
    .toBe(true);
  await expect(feed(page).getByText('Отправьте первое сообщение')).toBeVisible();
});

test('помечает неудачную отправку и повторяет её по кнопке', async ({ page }) => {
  const api = await mockGreenApi(page, { failSend: true });
  await page.goto('/');
  await openChat(page);

  const input = page.getByPlaceholder('Напишите сообщение…');
  await input.fill('Это не уйдёт');
  await input.press('Enter');

  const retry = page.getByRole('button', { name: 'Отправить ещё раз' });
  await expect(retry).toBeVisible();
  await expect(feed(page).getByText('Это не уйдёт')).toBeVisible();

  const before = api.calls.sendMessage.length;
  await retry.click();
  await expect.poll(() => api.calls.sendMessage.length).toBe(before + 1);
});

test('сохраняет переписку между перезагрузками и очищает её при выходе', async ({ page }) => {
  await mockGreenApi(page);
  await page.goto('/');
  await openChat(page);

  const input = page.getByPlaceholder('Напишите сообщение…');
  await input.fill('Переживёт перезагрузку');
  await input.press('Enter');
  await expect(feed(page).getByText('Переживёт перезагрузку')).toBeVisible();

  await page.reload();
  await page.locator('ul li button').first().click();
  await expect(feed(page).getByText('Переживёт перезагрузку')).toBeVisible();

  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page.getByRole('heading', { name: 'Вход в GREEN-API Chat' })).toBeVisible();

  const leftovers = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.includes('credentials') || k.includes('history')),
  );
  expect(leftovers).toEqual([]);
});
