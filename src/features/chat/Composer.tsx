import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MAX_MESSAGE_LENGTH } from '@/api/greenApi';
import { SendIcon } from '@/components/ui/Icons';
import { ru } from '@/i18n/ru';
import styles from './chat.module.css';

const COUNTER_FROM = MAX_MESSAGE_LENGTH - 200;
const MAX_HEIGHT_PX = 160;

interface ComposerProps {
  chatId: string;
  onSend: (text: string) => void;
}

export function Composer({ chatId, onSend }: ComposerProps) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const trimmed = text.trim();
  const tooLong = trimmed.length > MAX_MESSAGE_LENGTH;
  const canSend = trimmed.length > 0 && !tooLong;

  // Авторост высоты: сбрасываем, затем подгоняем под содержимое.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [text]);

  // Смена чата — очищаем черновик и возвращаем фокус.
  useLayoutEffect(() => {
    setText('');
    ref.current?.focus();
  }, [chatId]);

  function submit() {
    if (!canSend) return;
    onSend(trimmed);
    setText('');
    ref.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter отправляет, Shift+Enter переносит строку.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className={styles.composer}>
      <div className={styles.composerInner}>
        <textarea
          ref={ref}
          className={styles.composerInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ru.chat.placeholder}
          rows={1}
          aria-label={ru.chat.placeholder}
          aria-invalid={tooLong || undefined}
        />

        {trimmed.length > COUNTER_FROM && (
          <span
            className={[styles.counter, tooLong && styles.counterOver].filter(Boolean).join(' ')}
          >
            {trimmed.length} / {MAX_MESSAGE_LENGTH}
          </span>
        )}

        <button
          type="button"
          className={styles.sendButton}
          onClick={submit}
          disabled={!canSend}
          aria-label={ru.chat.send}
          title={ru.chat.send}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
