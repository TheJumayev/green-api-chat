import type { Chat, ChatState, Message } from './reducer';

const KEY = 'green-api-chat:history:v1';
/** Ограничение, чтобы localStorage не разрастался на длинной переписке. */
const MAX_MESSAGES_PER_CHAT = 200;

type Persisted = Pick<ChatState, 'chats' | 'messages'>;

export function loadHistory(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const { chats, messages } = parsed as Partial<Persisted>;
    if (!chats || !messages) return null;

    return {
      chats: chats as Record<string, Chat>,
      messages: messages as Record<string, Message[]>,
    };
  } catch {
    return null;
  }
}

export function saveHistory(state: ChatState): void {
  try {
    const messages: Record<string, Message[]> = {};
    for (const [chatId, list] of Object.entries(state.messages)) {
      // Незавершённые отправки не сохраняем: после перезагрузки они зависли бы.
      const settled = list.filter((m) => m.status !== 'sending');
      messages[chatId] = settled.slice(-MAX_MESSAGES_PER_CHAT);
    }
    localStorage.setItem(KEY, JSON.stringify({ chats: state.chats, messages }));
  } catch {
    // Приватный режим или переполнение квоты — история не критична.
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Игнорируем: нечего чистить.
  }
}
