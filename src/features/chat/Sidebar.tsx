import { useMemo, useState } from 'react';
import type { TransportStatus } from '@/api/transport/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ChatIcon,
  LogoutIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
} from '@/components/ui/Icons';
import { ru } from '@/i18n/ru';
import type { Theme } from '@/hooks/useTheme';
import type { Chat, ChatState } from './model/reducer';
import { lastMessageOf, sortedChats } from './model/reducer';
import { formatPhone } from './model/chatId';
import { formatListTime } from './format';
import styles from './chat.module.css';

const STATUS_CLASS: Record<TransportStatus, string> = {
  connected: styles.statusConnected!,
  reconnecting: styles.statusReconnecting!,
  error: styles.statusError!,
  idle: styles.statusIdle!,
};

interface SidebarProps {
  state: ChatState;
  onSelect: (chatId: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function Sidebar({
  state,
  onSelect,
  onNewChat,
  onLogout,
  theme,
  onToggleTheme,
}: SidebarProps) {
  const [query, setQuery] = useState('');

  const chats = useMemo(() => sortedChats(state), [state]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chats;
    return chats.filter((chat) => {
      const title = (chat.name ?? formatPhone(chat.chatId)).toLowerCase();
      return title.includes(needle) || chat.chatId.includes(needle.replace(/\D/g, ''));
    });
  }, [chats, query]);

  return (
    <aside className={styles.sidebar}>
      <header className={styles.sidebarHeader}>
        <h1 className={styles.sidebarTitle}>
          {ru.sidebar.title}
          <span
            className={[styles.statusDot, STATUS_CLASS[state.connection]].join(' ')}
            title={ru.connection[state.connection]}
          />
          <span className="visually-hidden">{ru.connection[state.connection]}</span>
        </h1>

        <IconButton
          label={theme === 'dark' ? ru.theme.toLight : ru.theme.toDark}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </IconButton>
        <IconButton label={ru.sidebar.logout} onClick={onLogout}>
          <LogoutIcon />
        </IconButton>
      </header>

      <div className={styles.sidebarTools}>
        <div className={styles.searchWrap}>
          <SearchIcon size={18} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ru.sidebar.search}
            aria-label={ru.sidebar.search}
          />
        </div>

        <Button variant="secondary" block onClick={onNewChat}>
          <PlusIcon size={18} />
          {ru.sidebar.newChat}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ChatIcon size={28} />}
          title={chats.length === 0 ? ru.sidebar.empty : ru.sidebar.nothingFound}
          hint={chats.length === 0 ? ru.sidebar.emptyHint : undefined}
        />
      ) : (
        <ul className={styles.chatList}>
          {filtered.map((chat) => (
            <li key={chat.chatId}>
              <ChatListItem
                chat={chat}
                preview={lastMessageOf(state, chat.chatId)?.text ?? ''}
                active={chat.chatId === state.activeChatId}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

interface ChatListItemProps {
  chat: Chat;
  preview: string;
  active: boolean;
  onSelect: (chatId: string) => void;
}

function ChatListItem({ chat, preview, active, onSelect }: ChatListItemProps) {
  const title = chat.name ?? formatPhone(chat.chatId);

  return (
    <button
      type="button"
      className={[styles.chatItem, active && styles.chatItemActive].filter(Boolean).join(' ')}
      onClick={() => onSelect(chat.chatId)}
      aria-current={active ? 'true' : undefined}
    >
      <Avatar seed={chat.chatId} title={title} />

      <span className={styles.chatItemBody}>
        <span className={styles.chatItemTop}>
          <span className={styles.chatItemName}>{title}</span>
          {chat.lastMessageAt > 0 && (
            <span className={styles.chatItemTime}>{formatListTime(chat.lastMessageAt)}</span>
          )}
        </span>
        <span className={styles.chatItemPreview}>{preview || '—'}</span>
      </span>
    </button>
  );
}
