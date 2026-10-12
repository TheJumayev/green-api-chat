import type { TransportStatus } from '@/api/transport/types';
import type { MessageData, WebhookBody } from '@/api/types';
import { isGroupChat } from './chatId';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  chatId: string;
  text: string;
  direction: 'in' | 'out';
  /** Unix-время в секундах. */
  timestamp: number;
  status: MessageStatus;
}

export interface Chat {
  chatId: string;
  name?: string;
  lastMessageAt: number;
}

export interface ChatState {
  chats: Record<string, Chat>;
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  connection: TransportStatus;
}

export const initialChatState: ChatState = {
  chats: {},
  messages: {},
  activeChatId: null,
  connection: 'idle',
};

export type ChatAction =
  | { type: 'openChat'; chatId: string; name?: string }
  | { type: 'selectChat'; chatId: string | null }
  | { type: 'messageQueued'; message: Message }
  | { type: 'messageSent'; chatId: string; localId: string; idMessage: string }
  | { type: 'messageFailed'; chatId: string; localId: string }
  | { type: 'messageRetrying'; chatId: string; localId: string }
  | { type: 'notification'; body: WebhookBody }
  | { type: 'connection'; status: TransportStatus }
  | { type: 'reset' };

/** Текст достаём только из текстовых типов — по заданию поддерживаем лишь текст. */
export function extractText(data: MessageData | undefined): string | null {
  if (!data) return null;
  if (data.typeMessage === 'textMessage') {
    return data.textMessageData?.textMessage ?? null;
  }
  if (data.typeMessage === 'extendedTextMessage') {
    return data.extendedTextMessageData?.text ?? null;
  }
  return null;
}

function upsertChat(
  state: ChatState,
  chatId: string,
  at: number,
  name?: string,
): ChatState['chats'] {
  const existing = state.chats[chatId];
  return {
    ...state.chats,
    [chatId]: {
      chatId,
      name: name ?? existing?.name,
      lastMessageAt: Math.max(at, existing?.lastMessageAt ?? 0),
    },
  };
}

/** Дедупликация по id: эхо собственных сообщений приходит обратно через вебхук. */
function appendMessage(list: Message[] | undefined, message: Message): Message[] {
  const current = list ?? [];
  if (current.some((m) => m.id === message.id)) return current;

  const next = [...current, message];
  next.sort((a, b) => a.timestamp - b.timestamp);
  return next;
}

function patchMessage(
  state: ChatState,
  chatId: string,
  id: string,
  patch: Partial<Message>,
): ChatState['messages'] {
  const list = state.messages[chatId];
  if (!list) return state.messages;

  return {
    ...state.messages,
    [chatId]: list.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'openChat': {
      const at = state.chats[action.chatId]?.lastMessageAt ?? Math.floor(Date.now() / 1000);
      return {
        ...state,
        chats: upsertChat(state, action.chatId, at, action.name),
        messages: { ...state.messages, [action.chatId]: state.messages[action.chatId] ?? [] },
        activeChatId: action.chatId,
      };
    }

    case 'selectChat':
      return { ...state, activeChatId: action.chatId };

    case 'messageQueued':
      return {
        ...state,
        chats: upsertChat(state, action.message.chatId, action.message.timestamp),
        messages: {
          ...state.messages,
          [action.message.chatId]: appendMessage(
            state.messages[action.message.chatId],
            action.message,
          ),
        },
      };

    case 'messageSent':
      return {
        ...state,
        messages: patchMessage(state, action.chatId, action.localId, {
          id: action.idMessage,
          status: 'sent',
        }),
      };

    case 'messageFailed':
      return {
        ...state,
        messages: patchMessage(state, action.chatId, action.localId, { status: 'failed' }),
      };

    case 'messageRetrying':
      return {
        ...state,
        messages: patchMessage(state, action.chatId, action.localId, { status: 'sending' }),
      };

    case 'connection':
      return { ...state, connection: action.status };

    case 'notification':
      return applyNotification(state, action.body);

    case 'reset':
      return initialChatState;

    default:
      return state;
  }
}

function applyNotification(state: ChatState, body: WebhookBody): ChatState {
  switch (body.typeWebhook) {
    case 'incomingMessageReceived':
    case 'outgoingMessageReceived':
    case 'outgoingAPIMessageReceived': {
      const { senderData, messageData, idMessage, timestamp } = body as {
        senderData?: { chatId?: string; senderName?: string; chatName?: string };
        messageData?: MessageData;
        idMessage?: string;
        timestamp?: number;
      };

      const chatId = senderData?.chatId;
      const text = extractText(messageData);

      // Пропускаем группы и всё, что не является текстом (требование: только текст).
      if (!chatId || !idMessage || !text || isGroupChat(chatId)) return state;

      const at = timestamp ?? Math.floor(Date.now() / 1000);
      const direction = body.typeWebhook === 'incomingMessageReceived' ? 'in' : 'out';
      const name = senderData?.senderName ?? senderData?.chatName;

      const message: Message = {
        id: idMessage,
        chatId,
        text,
        direction,
        timestamp: at,
        status: direction === 'out' ? 'sent' : 'delivered',
      };

      const list = state.messages[chatId];
      // Эхо собственного сообщения: оно уже лежит с тем же id — ничего не меняем.
      if (list?.some((m) => m.id === idMessage)) return state;

      return {
        ...state,
        chats: upsertChat(state, chatId, at, direction === 'in' ? name : undefined),
        messages: { ...state.messages, [chatId]: appendMessage(list, message) },
      };
    }

    case 'outgoingMessageStatus': {
      const { idMessage, status, chatId } = body as {
        idMessage?: string;
        status?: string;
        chatId?: string;
      };
      if (!idMessage || !status) return state;

      const mapped: MessageStatus | null =
        status === 'delivered'
          ? 'delivered'
          : status === 'read'
            ? 'read'
            : status === 'sent'
              ? 'sent'
              : status === 'failed' || status === 'noAccount' || status === 'notInGroup'
                ? 'failed'
                : null;
      if (!mapped) return state;

      const targetChatId =
        chatId ??
        Object.keys(state.messages).find((id) =>
          state.messages[id]?.some((m) => m.id === idMessage),
        );
      if (!targetChatId) return state;

      return {
        ...state,
        messages: patchMessage(state, targetChatId, idMessage, { status: mapped }),
      };
    }

    default:
      return state;
  }
}

/** Чаты для сайдбара: свежие сверху. */
export function sortedChats(state: ChatState): Chat[] {
  return Object.values(state.chats).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export function lastMessageOf(state: ChatState, chatId: string): Message | undefined {
  const list = state.messages[chatId];
  return list?.[list.length - 1];
}
