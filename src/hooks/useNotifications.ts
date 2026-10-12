import { useEffect, useRef, type Dispatch } from 'react';
import { createPollingTransport } from '@/api/transport/polling';
import type { NotificationTransport } from '@/api/transport/types';
import type { Credentials } from '@/api/types';
import type { ChatAction } from '@/features/chat/model/reducer';

/**
 * Подписка на входящие уведомления.
 *
 * Хук не знает, как устроен канал: он работает с NotificationTransport.
 * Сейчас это long polling по HTTP API — технология, заданная в требованиях.
 */
export function useNotifications(
  credentials: Credentials,
  dispatch: Dispatch<ChatAction>,
  createTransport: (c: Credentials) => NotificationTransport = createPollingTransport,
): void {
  // dispatch от useReducer стабилен, но ref страхует от лишних перезапусков цикла.
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    const transport = createTransport(credentials);

    transport.start({
      onNotification: (body) => dispatchRef.current({ type: 'notification', body }),
      onStatusChange: (status) => dispatchRef.current({ type: 'connection', status }),
    });

    return () => {
      transport.stop();
      dispatchRef.current({ type: 'connection', status: 'idle' });
    };
  }, [credentials, createTransport]);
}
