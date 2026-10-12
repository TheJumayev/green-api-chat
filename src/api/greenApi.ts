import { call } from './client';
import type {
  Credentials,
  DeleteNotificationResponse,
  Notification,
  SendMessageRequest,
  SendMessageResponse,
  SetSettingsRequest,
  SetSettingsResponse,
  StateInstanceResponse,
} from './types';

/** Максимальная длина сообщения в SendMessage. */
export const MAX_MESSAGE_LENGTH = 4000;

/** Проверка состояния инстанса — самый дешёвый способ проверить учётные данные. */
export async function getStateInstance(
  c: Credentials,
  signal?: AbortSignal,
): Promise<StateInstanceResponse> {
  const res = await call<StateInstanceResponse>(c, 'getStateInstance', { signal });
  return res ?? { stateInstance: 'notAuthorized' };
}

/**
 * Включает очередь уведомлений для HTTP API.
 * webhookUrl обязан быть пустым, иначе уведомления уйдут на вебхук
 * и receiveNotification всегда будет возвращать пусто.
 */
export async function setSettings(
  c: Credentials,
  settings: SetSettingsRequest = {
    webhookUrl: '',
    incomingWebhook: 'yes',
    outgoingWebhook: 'yes',
    outgoingAPIMessageWebhook: 'yes',
    stateWebhook: 'yes',
  },
): Promise<SetSettingsResponse> {
  const res = await call<SetSettingsResponse>(c, 'setSettings', {
    method: 'POST',
    body: settings,
  });
  return res ?? { saveSettings: false };
}

export async function sendMessage(
  c: Credentials,
  payload: SendMessageRequest,
): Promise<SendMessageResponse> {
  const res = await call<SendMessageResponse>(c, 'sendMessage', {
    method: 'POST',
    body: payload,
  });
  if (!res?.idMessage) {
    throw new Error('GREEN-API не вернул идентификатор сообщения');
  }
  return res;
}

/**
 * Long polling. Возвращает null, если за receiveTimeout секунд ничего не пришло.
 * Допустимый диапазон receiveTimeout — 5…60 секунд.
 */
export async function receiveNotification(
  c: Credentials,
  receiveTimeout = 20,
  signal?: AbortSignal,
): Promise<Notification | null> {
  const bounded = Math.min(60, Math.max(5, Math.round(receiveTimeout)));
  return call<Notification>(c, 'receiveNotification', {
    suffix: `?receiveTimeout=${bounded}`,
    signal,
  });
}

/**
 * Подтверждение обработки. Без него очередь встаёт: одно и то же уведомление
 * будет приходить снова и снова, а новые не появятся.
 */
export async function deleteNotification(
  c: Credentials,
  receiptId: number,
): Promise<DeleteNotificationResponse> {
  const res = await call<DeleteNotificationResponse>(c, 'deleteNotification', {
    method: 'DELETE',
    suffix: `/${receiptId}`,
  });
  return res ?? { result: false, reason: 'empty response' };
}
