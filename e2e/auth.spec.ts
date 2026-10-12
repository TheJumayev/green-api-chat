import { expect, test } from '@playwright/test';
import { API_TOKEN, ID_INSTANCE, mockGreenApi } from './mockGreenApi';

test.describe('Экран входа', () => {
  test('не отправляет запрос, пока данные не прошли валидацию', async ({ page }) => {
    const api = await mockGreenApi(page);
    await page.goto('/');

    await page.getByLabel('ID Instance').fill('abc');
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByText('только из цифр')).toBeVisible();
    expect(api.calls.getStateInstance).toBe(0);
  });

  test('проверяет инстанс и включает очередь уведомлений', async ({ page }) => {
    const api = await mockGreenApi(page, { state: 'authorized' });
    await page.goto('/');

    await page.getByLabel('ID Instance').fill(ID_INSTANCE);
    await page.getByLabel('API Token Instance').fill(API_TOKEN);
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();

    expect(api.calls.getStateInstance).toBe(1);
    // webhookUrl обязан быть пустым, иначе уведомления уйдут на вебхук
    // и receiveNotification всегда вернёт пусто.
    expect(api.calls.setSettings[0]).toMatchObject({
      webhookUrl: '',
      incomingWebhook: 'yes',
      outgoingWebhook: 'yes',
    });
  });

  test('объясняет, что инстанс не авторизован, и не трогает настройки', async ({ page }) => {
    const api = await mockGreenApi(page, { state: 'notAuthorized' });
    await page.goto('/');

    await page.getByLabel('ID Instance').fill(ID_INSTANCE);
    await page.getByLabel('API Token Instance').fill(API_TOKEN);
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByText(/QR-код/)).toBeVisible();
    expect(api.calls.setSettings).toHaveLength(0);
  });
});
