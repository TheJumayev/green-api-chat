import { useCallback, useState } from 'react';
import type { Theme } from '@/hooks/useTheme';
import { useChat } from './model/context';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { NewChatDialog } from './NewChatDialog';
import styles from './chat.module.css';

interface ChatLayoutProps {
  onLogout: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function ChatLayout({ onLogout, theme, onToggleTheme }: ChatLayoutProps) {
  const { state, openChat, selectChat, send, retry } = useChat();
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeChat = state.activeChatId ? (state.chats[state.activeChatId] ?? null) : null;
  const messages = state.activeChatId ? (state.messages[state.activeChatId] ?? []) : [];

  const handleNewChat = useCallback(
    (chatId: string) => {
      openChat(chatId);
      setDialogOpen(false);
    },
    [openChat],
  );

  const handleSend = useCallback(
    (text: string) => {
      if (state.activeChatId) void send(state.activeChatId, text);
    },
    [send, state.activeChatId],
  );

  return (
    // data-pane управляет тем, какая панель видна на узком экране.
    <div className={styles.layout} data-pane={activeChat ? 'chat' : 'list'}>
      <Sidebar
        state={state}
        onSelect={selectChat}
        onNewChat={() => setDialogOpen(true)}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <ChatWindow
        chat={activeChat}
        messages={messages}
        onSend={handleSend}
        onRetry={(message) => void retry(message)}
        onBack={() => selectChat(null)}
      />

      {dialogOpen && (
        <NewChatDialog onSubmit={handleNewChat} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}
