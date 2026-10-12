import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ru } from '@/i18n/ru';
import { PhoneValidationError, toChatId } from './model/chatId';
import styles from './chat.module.css';

interface NewChatDialogProps {
  onSubmit: (chatId: string) => void;
  onClose: () => void;
}

export function NewChatDialog({ onSubmit, onClose }: NewChatDialogProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      onSubmit(toChatId(phone));
    } catch (err) {
      setError(err instanceof PhoneValidationError ? err.message : ru.errors.generic);
    }
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
      >
        <h2 className={styles.modalTitle} id="new-chat-title">
          {ru.newChat.title}
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <TextField
            ref={inputRef}
            label={ru.newChat.label}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError(null);
            }}
            error={error ?? undefined}
            hint={ru.newChat.hint}
            placeholder={ru.newChat.placeholder}
            inputMode="tel"
            autoComplete="off"
          />

          <div className={styles.modalActions}>
            <Button variant="secondary" size="lg" onClick={onClose}>
              {ru.newChat.cancel}
            </Button>
            <Button type="submit" size="lg">
              {ru.newChat.submit}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
