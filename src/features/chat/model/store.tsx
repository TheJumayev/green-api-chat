import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { MAX_MESSAGE_LENGTH, sendMessage } from '@/api/greenApi';
import type { Credentials } from '@/api/types';
import { useNotifications } from '@/hooks/useNotifications';
import { ChatContext, type ChatContextValue } from './context';
import { chatReducer, initialChatState, type ChatState, type Message } from './reducer';
import { loadHistory, saveHistory } from './persist';

function localId(): string {
  return `local-${crypto.randomUUID()}`;
}

/**
 * История читается лениво, при создании редьюсера.
 *
 * Через эффект это делать нельзя: эффект сохранения успевает записать пустое
 * состояние раньше, чем применится восстановленное, и в StrictMode второй
 * проход читает уже затёртое хранилище.
 */
function init(): ChatState {
  const saved = loadHistory();
  return saved ? { ...initialChatState, ...saved } : initialChatState;
}

export function ChatProvider({
  credentials,
  children,
}: {
  credentials: Credentials;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(chatReducer, undefined, init);

  useEffect(() => {
    saveHistory(state);
  }, [state]);

  useNotifications(credentials, dispatch);

  const openChat = useCallback((chatId: string) => {
    dispatch({ type: 'openChat', chatId });
  }, []);

  const selectChat = useCallback((chatId: string | null) => {
    dispatch({ type: 'selectChat', chatId });
  }, []);

  const deliver = useCallback(
    async (chatId: string, text: string, id: string) => {
      try {
        const { idMessage } = await sendMessage(credentials, { chatId, message: text });
        dispatch({ type: 'messageSent', chatId, localId: id, idMessage });
      } catch {
        dispatch({ type: 'messageFailed', chatId, localId: id });
      }
    },
    [credentials],
  );

  const send = useCallback(
    async (chatId: string, rawText: string) => {
      const text = rawText.trim();
      if (!text || text.length > MAX_MESSAGE_LENGTH) return;

      const id = localId();
      // Оптимистично показываем сообщение сразу — интерфейс не ждёт сеть.
      dispatch({
        type: 'messageQueued',
        message: {
          id,
          chatId,
          text,
          direction: 'out',
          timestamp: Math.floor(Date.now() / 1000),
          status: 'sending',
        },
      });

      await deliver(chatId, text, id);
    },
    [deliver],
  );

  const retry = useCallback(
    async (message: Message) => {
      dispatch({ type: 'messageRetrying', chatId: message.chatId, localId: message.id });
      await deliver(message.chatId, message.text, message.id);
    },
    [deliver],
  );

  const value = useMemo<ChatContextValue>(
    () => ({ state, openChat, selectChat, send, retry }),
    [state, openChat, selectChat, send, retry],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
