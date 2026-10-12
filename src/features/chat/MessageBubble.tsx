import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon } from '@/components/ui/Icons';
import { ru } from '@/i18n/ru';
import type { Message } from './model/reducer';
import { formatTime } from './format';
import styles from './chat.module.css';

interface MessageBubbleProps {
  message: Message;
  /** Предыдущее сообщение от того же отправителя — прижимаем пузыри друг к другу. */
  stacked: boolean;
  onRetry: (message: Message) => void;
}

function StatusIcon({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'sending':
      return <ClockIcon size={14} />;
    case 'sent':
      return <CheckIcon size={14} />;
    case 'delivered':
      return <DoubleCheckIcon size={14} />;
    case 'read':
      return <DoubleCheckIcon size={14} />;
    case 'failed':
      return <AlertIcon size={14} className={styles.statusFailed} />;
    default:
      return null;
  }
}

const STATUS_LABEL: Record<Message['status'], string> = {
  sending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
};

export function MessageBubble({ message, stacked, onRetry }: MessageBubbleProps) {
  const isOut = message.direction === 'out';

  return (
    <div
      className={[styles.row, isOut ? styles.rowOut : styles.rowIn, stacked && styles.rowStacked]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={[styles.bubble, isOut ? styles.bubbleOut : styles.bubbleIn].join(' ')}>
        {message.text}

        <span className={styles.bubbleMeta}>
          <time dateTime={new Date(message.timestamp * 1000).toISOString()}>
            {formatTime(message.timestamp)}
          </time>

          {isOut && (
            <>
              <span className="visually-hidden">{STATUS_LABEL[message.status]}</span>
              <StatusIcon status={message.status} />
            </>
          )}
        </span>

        {isOut && message.status === 'failed' && (
          <button type="button" className={styles.retryButton} onClick={() => onRetry(message)}>
            {ru.chat.retry}
          </button>
        )}
      </div>
    </div>
  );
}
