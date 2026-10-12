import { describe, expect, it } from 'vitest';
import type { WebhookBody } from '@/api/types';
import { chatReducer, initialChatState, type ChatState, type Message } from './reducer';

const CHAT = '998901234567@c.us';

function incoming(idMessage: string, text: string, timestamp = 1_700_000_000): WebhookBody {
  return {
    typeWebhook: 'incomingMessageReceived',
    timestamp,
    idMessage,
    senderData: { chatId: CHAT, senderName: 'Тест' },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
  } as WebhookBody;
}

function queued(id: string, timestamp = 1_700_000_000): Message {
  return { id, chatId: CHAT, text: 'привет', direction: 'out', timestamp, status: 'sending' };
}

describe('chatReducer', () => {
  it('добавляет входящее сообщение и создаёт чат', () => {
    const state = chatReducer(initialChatState, {
      type: 'notification',
      body: incoming('m1', 'привет'),
    });

    expect(state.chats[CHAT]).toBeDefined();
    expect(state.messages[CHAT]).toHaveLength(1);
    expect(state.messages[CHAT]?.[0]?.text).toBe('привет');
    expect(state.messages[CHAT]?.[0]?.direction).toBe('in');
  });

  it('игнорирует повторную доставку того же уведомления', () => {
    let state = chatReducer(initialChatState, {
      type: 'notification',
      body: incoming('m1', 'раз'),
    });
    state = chatReducer(state, { type: 'notification', body: incoming('m1', 'раз') });

    expect(state.messages[CHAT]).toHaveLength(1);
  });

  it('пропускает нетекстовые сообщения', () => {
    const body = {
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1,
      idMessage: 'm2',
      senderData: { chatId: CHAT },
      messageData: { typeMessage: 'imageMessage' },
    } as WebhookBody;

    const state = chatReducer(initialChatState, { type: 'notification', body });
    expect(state.messages[CHAT]).toBeUndefined();
  });

  it('пропускает групповые чаты', () => {
    const body = {
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1,
      idMessage: 'm3',
      senderData: { chatId: '123-456@g.us' },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'в группе' } },
    } as WebhookBody;

    const state = chatReducer(initialChatState, { type: 'notification', body });
    expect(Object.keys(state.chats)).toHaveLength(0);
  });

  it('переводит сообщение из sending в sent и подменяет id', () => {
    let state = chatReducer(initialChatState, {
      type: 'messageQueued',
      message: queued('local-1'),
    });
    state = chatReducer(state, {
      type: 'messageSent',
      chatId: CHAT,
      localId: 'local-1',
      idMessage: 'srv-1',
    });

    expect(state.messages[CHAT]?.[0]?.id).toBe('srv-1');
    expect(state.messages[CHAT]?.[0]?.status).toBe('sent');
  });

  it('не дублирует собственное сообщение, вернувшееся эхом', () => {
    let state = chatReducer(initialChatState, {
      type: 'messageQueued',
      message: queued('local-1'),
    });
    state = chatReducer(state, {
      type: 'messageSent',
      chatId: CHAT,
      localId: 'local-1',
      idMessage: 'srv-1',
    });

    const echo = {
      typeWebhook: 'outgoingAPIMessageReceived',
      timestamp: 1_700_000_000,
      idMessage: 'srv-1',
      senderData: { chatId: CHAT },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'привет' } },
    } as WebhookBody;

    state = chatReducer(state, { type: 'notification', body: echo });
    expect(state.messages[CHAT]).toHaveLength(1);
  });

  it('обновляет статус по outgoingMessageStatus', () => {
    let state = chatReducer(initialChatState, { type: 'messageQueued', message: queued('srv-1') });
    state = chatReducer(state, {
      type: 'notification',
      body: {
        typeWebhook: 'outgoingMessageStatus',
        timestamp: 1,
        idMessage: 'srv-1',
        status: 'read',
      } as WebhookBody,
    });

    expect(state.messages[CHAT]?.[0]?.status).toBe('read');
  });

  it('помечает сообщение как failed и возвращает в sending при повторе', () => {
    let state: ChatState = chatReducer(initialChatState, {
      type: 'messageQueued',
      message: queued('local-1'),
    });
    state = chatReducer(state, { type: 'messageFailed', chatId: CHAT, localId: 'local-1' });
    expect(state.messages[CHAT]?.[0]?.status).toBe('failed');

    state = chatReducer(state, { type: 'messageRetrying', chatId: CHAT, localId: 'local-1' });
    expect(state.messages[CHAT]?.[0]?.status).toBe('sending');
  });

  it('держит сообщения отсортированными по времени', () => {
    let state = chatReducer(initialChatState, {
      type: 'notification',
      body: incoming('m2', 'позже', 200),
    });
    state = chatReducer(state, { type: 'notification', body: incoming('m1', 'раньше', 100) });

    expect(state.messages[CHAT]?.map((m) => m.text)).toEqual(['раньше', 'позже']);
  });
});
