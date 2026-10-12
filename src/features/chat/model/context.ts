import { createContext, useContext } from 'react';
import type { ChatState, Message } from './reducer';

export interface ChatContextValue {
  state: ChatState;
  openChat: (chatId: string) => void;
  selectChat: (chatId: string | null) => void;
  send: (chatId: string, text: string) => Promise<void>;
  retry: (message: Message) => Promise<void>;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat должен вызываться внутри ChatProvider');
  return ctx;
}
