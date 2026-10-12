import type { WebhookBody } from '../types';

export type TransportStatus = 'idle' | 'connected' | 'reconnecting' | 'error';

/**
 * Канал доставки входящих уведомлений.
 *
 * В задании требуется HTTP API (long polling) — см. pollingTransport.
 * У GREEN-API сейчас нет WebSocket для уведомлений: в документации описаны
 * только HTTP API и Webhook Endpoint (вебхук требует собственного бэкенда).
 * Интерфейс оставлен абстрактным, чтобы добавление другого канала
 * не затрагивало стор и UI.
 */
export interface NotificationTransport {
  start(handlers: TransportHandlers): void;
  stop(): void;
}

export interface TransportHandlers {
  onNotification: (body: WebhookBody) => void;
  onStatusChange: (status: TransportStatus) => void;
}
