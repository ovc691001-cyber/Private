declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
        close?: () => void;
        colorScheme?: "light" | "dark";
      };
    };
  }
}

export function getTelegramInitData(): string {
  if (typeof window === "undefined") return "";
  return window.Telegram?.WebApp?.initData ?? "";
}

export function setupTelegramTheme(): void {
  if (typeof window === "undefined") return;
  window.Telegram?.WebApp?.ready?.();
  window.Telegram?.WebApp?.expand?.();
  const scheme = window.Telegram?.WebApp?.colorScheme;
  if (scheme) document.documentElement.dataset.theme = scheme;
}

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server";
  const raw = [navigator.userAgent, navigator.language, screen.width, screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = Math.imul(31, hash) + raw.charCodeAt(i);
  return `fp_${Math.abs(hash)}`;
}
