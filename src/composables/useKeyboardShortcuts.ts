import { onMounted, onUnmounted } from "vue";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = (event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl
        ? event.ctrlKey || event.metaKey
        : !event.ctrlKey && !event.metaKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  return {
    shortcuts,
  };
}

export const GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: "k",
    ctrl: true,
    description: "Open search",
    action: () => {},
  },
  {
    key: "n",
    ctrl: true,
    description: "New account",
    action: () => {},
  },
  {
    key: "t",
    ctrl: true,
    description: "New transfer",
    action: () => {},
  },
  {
    key: "d",
    ctrl: true,
    description: "Toggle dark mode",
    action: () => {},
  },
  {
    key: "r",
    ctrl: true,
    description: "Refresh data",
    action: () => {},
  },
  {
    key: "/",
    description: "Show keyboard shortcuts",
    action: () => {},
  },
];
