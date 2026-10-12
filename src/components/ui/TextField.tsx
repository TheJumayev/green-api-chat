import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import styles from './ui.module.css';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label?: string;
  error?: string;
  hint?: string;
  /** Кнопка внутри поля — например показать/скрыть токен. */
  action?: ReactNode;
  /** В React 19 ref передаётся обычным пропом, forwardRef не нужен. */
  ref?: Ref<HTMLInputElement>;
}

export function TextField({ label, error, hint, action, className, ref, ...rest }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}

      <div className={styles.inputWrap}>
        <input
          {...rest}
          ref={ref}
          id={id}
          className={[styles.input, action && styles.inputWithAction, error && styles.inputError]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
        />
        {action && <span className={styles.inputAction}>{action}</span>}
      </div>

      {error && (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}
