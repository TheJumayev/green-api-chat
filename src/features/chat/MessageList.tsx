import { Fragment } from 'react';
import { ChatIcon } from '@/components/ui/Icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { ru } from '@/i18n/ru';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import type { Message } from './model/reducer';
import { MessageBubble } from './MessageBubble';
import { dayKey, formatDay } from './format';
import styles from './chat.module.css';

interface MessageListProps {
  messages: Message[];
  onRetry: (message: Message) => void;
}

export function MessageList({ messages, onRetry }: MessageListProps) {
  const ref = useAutoScroll<HTMLDivElement>(messages.length);

  if (messages.length === 0) {
    return (
      <div className={styles.messageList}>
        <EmptyState icon={<ChatIcon size={28} />} title={ru.chat.emptyMessages} />
      </div>
    );
  }

  return (
    <div
      className={styles.messageList}
      ref={ref}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Сообщения"
    >
      <div className={styles.messageListInner}>
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const newDay = !previous || dayKey(previous.timestamp) !== dayKey(message.timestamp);
          const stacked = !newDay && previous?.direction === message.direction;

          return (
            <Fragment key={message.id}>
              {newDay && <div className={styles.dateDivider}>{formatDay(message.timestamp)}</div>}
              <MessageBubble message={message} stacked={stacked} onRetry={onRetry} />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
