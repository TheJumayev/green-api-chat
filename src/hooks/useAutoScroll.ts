import { useEffect, useRef } from 'react';

/** Расстояние от низа, в пределах которого считаем, что пользователь «внизу». */
const STICK_THRESHOLD_PX = 120;

/**
 * Прокрутка к новым сообщениям — но только если пользователь не ушёл вверх
 * читать историю.
 */
export function useAutoScroll<T extends HTMLElement>(dependency: unknown) {
  const ref = useRef<T>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const onScroll = () => {
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      stickToBottom.current = distance < STICK_THRESHOLD_PX;
    };

    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || !stickToBottom.current) return;
    node.scrollTop = node.scrollHeight;
  }, [dependency]);

  return ref;
}
