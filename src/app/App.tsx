import { useCallback, useEffect, useState } from 'react';
import type { Credentials } from '@/api/types';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { clearCredentials, loadCredentials, saveCredentials } from '@/features/auth/credentials';
import { ChatLayout } from '@/features/chat/ChatLayout';
import { ChatProvider } from '@/features/chat/model/store';
import { clearHistory } from '@/features/chat/model/persist';
import { useTheme } from '@/hooks/useTheme';

export function App() {
  const { theme, toggle } = useTheme();
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  // Восстанавливаем сессию до первой отрисовки чата.
  useEffect(() => {
    setCredentials(loadCredentials());
  }, []);

  const handleAuthenticated = useCallback((next: Credentials) => {
    saveCredentials(next);
    setCredentials(next);
  }, []);

  const handleLogout = useCallback(() => {
    clearCredentials();
    clearHistory();
    setCredentials(null);
  }, []);

  if (!credentials) {
    return (
      <AuthScreen onAuthenticated={handleAuthenticated} theme={theme} onToggleTheme={toggle} />
    );
  }

  return (
    // key по инстансу: смена учётных данных поднимает чистый стор и новый цикл опроса.
    <ChatProvider credentials={credentials} key={credentials.idInstance}>
      <ChatLayout onLogout={handleLogout} theme={theme} onToggleTheme={toggle} />
    </ChatProvider>
  );
}
