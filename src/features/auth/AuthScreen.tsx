import { useState, type FormEvent } from 'react';
import { getStateInstance, setSettings } from '@/api/greenApi';
import { ApiError, type Credentials } from '@/api/types';
import { Button, IconButton } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { AlertIcon, ChatIcon, EyeIcon, EyeOffIcon, MoonIcon, SunIcon } from '@/components/ui/Icons';
import { ru } from '@/i18n/ru';
import type { Theme } from '@/hooks/useTheme';
import {
  DEFAULT_API_URL,
  normalize,
  validate,
  type CredentialsDraft,
  type CredentialsErrors,
} from './credentials';
import styles from './auth.module.css';

interface AuthScreenProps {
  onAuthenticated: (credentials: Credentials) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function AuthScreen({ onAuthenticated, theme, onToggleTheme }: AuthScreenProps) {
  const [draft, setDraft] = useState<CredentialsDraft>({
    idInstance: '',
    apiTokenInstance: '',
    apiUrl: DEFAULT_API_URL,
  });
  const [errors, setErrors] = useState<CredentialsErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [checking, setChecking] = useState(false);

  const update = (key: keyof CredentialsDraft) => (value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setFormError(null);
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const credentials = normalize(draft);
    setChecking(true);
    setFormError(null);

    try {
      const { stateInstance } = await getStateInstance(credentials);

      if (stateInstance !== 'authorized') {
        setFormError(
          ru.auth.states[stateInstance as keyof typeof ru.auth.states] ??
            ru.auth.states.notAuthorized,
        );
        return;
      }

      // Включаем очередь уведомлений для HTTP API. Без этого receiveNotification
      // всегда возвращает пусто. Ошибку не считаем фатальной: настройки могли
      // быть выставлены раньше вручную в личном кабинете.
      await setSettings(credentials).catch(() => undefined);

      onAuthenticated(credentials);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : ru.errors.generic);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.themeToggle}>
        <IconButton
          label={theme === 'dark' ? ru.theme.toLight : ru.theme.toDark}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </IconButton>
      </div>

      <main className={styles.card}>
        <div className={styles.logo}>
          <ChatIcon size={28} />
        </div>

        <h1 className={styles.title}>{ru.auth.title}</h1>
        <p className={styles.subtitle}>{ru.auth.subtitle}</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField
            label={ru.auth.idInstance}
            value={draft.idInstance}
            onChange={(e) => update('idInstance')(e.target.value)}
            error={errors.idInstance}
            placeholder="1101234567"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
          />

          <TextField
            label={ru.auth.apiToken}
            value={draft.apiTokenInstance}
            onChange={(e) => update('apiTokenInstance')(e.target.value)}
            error={errors.apiTokenInstance}
            type={showToken ? 'text' : 'password'}
            placeholder="••••••••••••••••"
            autoComplete="off"
            spellCheck={false}
            action={
              <IconButton
                label={showToken ? ru.auth.hideToken : ru.auth.showToken}
                onClick={() => setShowToken((v) => !v)}
                tabIndex={-1}
              >
                {showToken ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </IconButton>
            }
          />

          <details className={styles.advanced}>
            <summary className={styles.advancedSummary}>{ru.auth.advanced}</summary>
            <div className={styles.advancedBody}>
              <TextField
                label={ru.auth.apiUrl}
                value={draft.apiUrl}
                onChange={(e) => update('apiUrl')(e.target.value)}
                error={errors.apiUrl}
                hint={ru.auth.apiUrlHint}
                placeholder={DEFAULT_API_URL}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </details>

          {formError && (
            <div className={styles.alert} role="alert">
              <AlertIcon size={18} className={styles.alertIcon} />
              <span>{formError}</span>
            </div>
          )}

          <Button type="submit" size="lg" block loading={checking}>
            {checking ? ru.auth.checking : ru.auth.submit}
          </Button>
        </form>

        <p className={styles.footer}>
          <a href={ru.auth.helpHref} target="_blank" rel="noreferrer noopener">
            {ru.auth.help}
          </a>
        </p>
      </main>
    </div>
  );
}
