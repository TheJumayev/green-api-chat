import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { BackIcon, ChatIcon } from '@/components/ui/Icons';
import { ru } from '@/i18n/ru';
import type { Chat, Message } from './model/reducer';
import { formatPhone } from './model/chatId';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import styles from './chat.module.css';

interface ChatWindowProps {
  chat: Chat | null;
  messages: Message[];
  onSend: (text: string) => void;
  onRetry: (message: Message) => void;
  onBack: () => void;
}

export function ChatWindow({ chat, messages, onSend, onRetry, onBack }: ChatWindowProps) {
  if (!chat) {
    return (
      <section className={styles.main}>
        <EmptyState icon={<ChatIcon size={28} />} title={ru.chat.empty} />
      </section>
    );
  }

  const title = chat.name ?? formatPhone(chat.chatId);

  return (
    <section className={styles.main}>
      <header className={styles.chatHeader}>
        <IconButton label={ru.chat.back} onClick={onBack} className={styles.backButton}>
          <BackIcon />
        </IconButton>

        <Avatar seed={chat.chatId} title={title} />

        <div className={styles.chatHeaderBody}>
          <h2 className={styles.chatHeaderName}>{title}</h2>
          {chat.name && <span className={styles.chatHeaderStatus}>{formatPhone(chat.chatId)}</span>}
        </div>
      </header>

      <MessageList messages={messages} onRetry={onRetry} />
      <Composer chatId={chat.chatId} onSend={onSend} />
    </section>
  );
}
