/** Учётные данные инстанса GREEN-API. */
export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  /** Например https://api.green-api.com или https://7103.api.greenapi.com */
  apiUrl: string;
}

export type InstanceState =
  'authorized' | 'notAuthorized' | 'blocked' | 'sleepMode' | 'starting' | 'yellowCard';

export interface StateInstanceResponse {
  stateInstance: InstanceState;
}

export interface SendMessageRequest {
  chatId: string;
  message: string;
  quotedMessageId?: string;
  /** 1000–20000 мс */
  typingTime?: number;
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface SetSettingsRequest {
  /** Пустая строка — уведомления складываются в очередь для HTTP API. */
  webhookUrl: string;
  incomingWebhook?: 'yes' | 'no';
  outgoingWebhook?: 'yes' | 'no';
  outgoingAPIMessageWebhook?: 'yes' | 'no';
  stateWebhook?: 'yes' | 'no';
}

export interface SetSettingsResponse {
  saveSettings: boolean;
}

export interface DeleteNotificationResponse {
  result: boolean;
  reason: string;
}

/* ------------------------------ Уведомления ------------------------------ */

export interface SenderData {
  chatId: string;
  chatName?: string;
  sender?: string;
  senderName?: string;
  senderContactName?: string;
}

/**
 * GREEN-API присылает десятки типов сообщений. Нас интересует только текст,
 * поэтому текстовые поля описаны явно, а остальное остаётся нетипизированным.
 */
export interface MessageData {
  typeMessage: string;
  textMessageData?: { textMessage?: string };
  extendedTextMessageData?: { text?: string };
  [key: string]: unknown;
}

interface WebhookBase {
  instanceData?: { idInstance: number; wid: string; typeInstance: string };
  timestamp: number;
}

export interface IncomingMessageWebhook extends WebhookBase {
  typeWebhook: 'incomingMessageReceived';
  idMessage: string;
  senderData: SenderData;
  messageData: MessageData;
}

export interface OutgoingMessageWebhook extends WebhookBase {
  typeWebhook: 'outgoingMessageReceived' | 'outgoingAPIMessageReceived';
  idMessage: string;
  senderData: SenderData;
  messageData: MessageData;
}

export interface OutgoingStatusWebhook extends WebhookBase {
  typeWebhook: 'outgoingMessageStatus';
  idMessage: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount' | 'notInGroup';
  chatId?: string;
}

export interface StateChangedWebhook extends WebhookBase {
  typeWebhook: 'stateInstanceChanged';
  stateInstance: InstanceState;
}

export interface UnknownWebhook extends WebhookBase {
  typeWebhook: string;
  [key: string]: unknown;
}

export type WebhookBody =
  | IncomingMessageWebhook
  | OutgoingMessageWebhook
  | OutgoingStatusWebhook
  | StateChangedWebhook
  | UnknownWebhook;

export interface Notification {
  receiptId: number;
  body: WebhookBody;
}

/* --------------------------------- Ошибки -------------------------------- */

export type ApiErrorKind =
  | 'network'
  | 'cors'
  | 'unauthorized'
  | 'validation'
  | 'suspended'
  | 'rateLimit'
  | 'server'
  | 'aborted'
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}
