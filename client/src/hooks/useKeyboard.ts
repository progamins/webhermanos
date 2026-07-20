import { useEffect } from 'react';

export function useKeyboard(
  key: string,
  handler: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === key) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, handler, enabled]);
}

export function useKeyboardShortcuts(
  shortcuts: { key: string; handler: () => void; ctrl?: boolean; enabled?: boolean }[]
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchCtrl = shortcut.ctrl ? e.ctrlKey || e.metaKey : true;
        if (e.key === shortcut.key && matchCtrl && (shortcut.enabled ?? true)) {
          e.preventDefault();
          shortcut.handler();
          return;
          }
        }
      };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
