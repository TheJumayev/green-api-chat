import type { Credentials } from '@/api/types';

const KEY = 'green-api-chat:credentials:v1';

export const DEFAULT_API_URL = 'https://api.green-api.com';

export interface CredentialsDraft {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
}

export type CredentialsErrors = Partial<Record<keyof CredentialsDraft, string>>;

export function validate(draft: CredentialsDraft): CredentialsErrors {
  const errors: CredentialsErrors = {};

  const id = draft.idInstance.trim();
  if (!id) errors.idInstance = 'Укажите idInstance';
  else if (!/^\d{6,}$/.test(id)) errors.idInstance = 'idInstance состоит только из цифр';

  const token = draft.apiTokenInstance.trim();
  if (!token) errors.apiTokenInstance = 'Укажите apiTokenInstance';
  else if (token.length < 20) errors.apiTokenInstance = 'Токен выглядит слишком коротким';

  const url = draft.apiUrl.trim();
  if (!url) {
    errors.apiUrl = 'Укажите адрес API';
  } else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') errors.apiUrl = 'Адрес должен начинаться с https://';
    } catch {
      errors.apiUrl = 'Некорректный адрес';
    }
  }

  return errors;
}

export function normalize(draft: CredentialsDraft): Credentials {
  return {
    idInstance: draft.idInstance.trim(),
    apiTokenInstance: draft.apiTokenInstance.trim(),
    apiUrl: draft.apiUrl.trim().replace(/\/+$/, ''),
  };
}

export function loadCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const { idInstance, apiTokenInstance, apiUrl } = parsed as Partial<Credentials>;
    if (!idInstance || !apiTokenInstance) return null;

    return { idInstance, apiTokenInstance, apiUrl: apiUrl || DEFAULT_API_URL };
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: Credentials): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(credentials));
  } catch {
    // Приватный режим — пользователь просто введёт данные заново.
  }
}

export function clearCredentials(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Игнорируем.
  }
}
